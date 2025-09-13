import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import historyRoutes from './historyRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/history', historyRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Log Sleuth API is running',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Log Sleuth API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      history: '/api/history',
      admin: '/api/admin',
      health: '/api/health'
    },
    documentation: 'https://api-docs.log-sleuth.com',
    timestamp: new Date()
  });
});

export default router;
