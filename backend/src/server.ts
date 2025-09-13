import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// Import configurations and middleware
import connectDB from './config/database';
import { logger } from './config/logger';
import { 
  securityHeaders, 
  generalRateLimit, 
  sanitizeInput, 
  validateContentType,
  limitRequestSize,
  corsOptions,
  errorHandler 
} from './middleware/security';

// Import routes
import routes from './routes';

// Import models to ensure they're registered
import './models';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Performance middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => {
        logger.info(message.trim());
      }
    }
  }));
}

// Security and validation middleware
app.use(generalRateLimit);
app.use(sanitizeInput);
app.use(validateContentType(['application/json', 'multipart/form-data', 'text/plain']));
app.use(limitRequestSize(10 * 1024 * 1024)); // 10MB limit

// API routes
app.use('/api', routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    timestamp: new Date()
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Create default admin user if it doesn't exist
    await createDefaultAdmin();
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Log Sleuth Backend Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    const { User } = await import('./models');
    
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@log-sleuth.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const adminUser = new User({
        email: adminEmail,
        password: adminPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
        isEmailVerified: true
      });
      
      await adminUser.save();
      logger.info(`✅ Default admin user created: ${adminEmail}`);
      logger.info(`🔑 Default admin password: ${adminPassword}`);
      logger.warn('⚠️  Please change the default admin password after first login!');
    } else {
      logger.info('✅ Admin user already exists');
    }
  } catch (error) {
    logger.error('Failed to create default admin user:', error);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

export default app;
