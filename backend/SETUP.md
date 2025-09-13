# Log Sleuth Backend Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- npm or yarn

### Installation Steps

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Required - Update these values
   MONGODB_URI=mongodb://localhost:27017/log-sleuth
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_REFRESH_SECRET=your-refresh-token-secret
   GEMINI_API_KEY=your-gemini-api-key
   
   # Optional - Keep defaults or customize
   PORT=5000
   NODE_ENV=development
   DEFAULT_ADMIN_EMAIL=admin@log-sleuth.com
   DEFAULT_ADMIN_PASSWORD=admin123
   ```

4. **Start MongoDB**
   ```bash
   # Windows (if MongoDB is installed as service)
   net start MongoDB
   
   # macOS/Linux
   mongod
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   # Development mode (with hot reload)
   npm run dev
   
   # Production mode
   npm start
   ```

7. **Verify installation**
   - Open http://localhost:5000/api/health
   - Should return: `{"success": true, "message": "Log Sleuth API is running"}`

### Default Admin Account
- **Email**: admin@log-sleuth.com
- **Password**: admin123
- **⚠️ Change password after first login!**

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run build:watch  # Build with watch mode
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Check code style
npm run lint:fix     # Fix code style issues
npm run seed         # Seed database with sample data
npm run create-admin # Create admin user manually
npm run clean        # Clean build directory
```

### Database Operations
```bash
# Create admin user
npm run create-admin

# Seed sample data for development
npm run seed

# Connect to MongoDB shell
mongo log-sleuth
```

### API Testing
```bash
# Health check
curl http://localhost:5000/api/health

# Register new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123!"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@log-sleuth.com","password":"admin123"}'
```

## Project Structure

```
src/
├── config/           # Configuration files
│   ├── database.ts   # MongoDB connection
│   └── logger.ts     # Winston logging setup
├── controllers/      # Route controllers
│   ├── authController.ts
│   ├── userController.ts
│   ├── historyController.ts
│   └── adminController.ts
├── middleware/       # Express middleware
│   ├── auth.ts       # Authentication middleware
│   └── security.ts   # Security middleware
├── models/           # Database models
│   ├── User.ts
│   ├── Session.ts
│   ├── HistoryEntry.ts
│   └── AuditLog.ts
├── routes/           # API routes
│   ├── authRoutes.ts
│   ├── userRoutes.ts
│   ├── historyRoutes.ts
│   ├── adminRoutes.ts
│   └── index.ts
├── services/         # External services
│   └── geminiService.ts
├── scripts/          # Utility scripts
│   ├── createAdmin.ts
│   └── seed.ts
├── types/            # TypeScript types
│   └── index.ts
├── utils/            # Utility functions
│   ├── auth.ts
│   ├── validation.ts
│   ├── response.ts
│   └── seedData.ts
└── server.ts         # Main server file
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login  
- `POST /logout` - User logout
- `GET /profile` - Get user profile
- `PUT /profile` - Update profile
- `POST /change-password` - Change password

### Log Analysis (`/api/history`)
- `POST /` - Create new analysis
- `GET /` - Get user's analyses
- `GET /public` - Get public analyses
- `GET /:id` - Get specific analysis
- `PUT /:id` - Update analysis
- `DELETE /:id` - Delete analysis

### User Management (`/api/users`) - Admin Only
- `GET /` - Get all users
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user

### Admin Dashboard (`/api/admin`) - Admin Only
- `GET /dashboard/stats` - Dashboard statistics
- `GET /analytics/users` - User analytics
- `GET /analytics/security` - Security analytics
- `GET /audit-logs` - Audit logs

## Environment Configuration

### Required Environment Variables
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret (use strong random string)
- `JWT_REFRESH_SECRET` - Refresh token secret
- `GEMINI_API_KEY` - Google Gemini API key

### Optional Environment Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `DEFAULT_ADMIN_EMAIL` - Default admin email
- `DEFAULT_ADMIN_PASSWORD` - Default admin password
- `BCRYPT_ROUNDS` - Password hashing rounds (default: 12)
- `MAX_FILE_SIZE` - Max upload size in bytes (default: 10MB)

## Security Features

### Authentication
- JWT tokens with refresh token rotation
- Password hashing with bcrypt
- Account lockout after failed attempts
- Session management with device tracking

### Authorization
- Role-based access control (User/Admin)
- Route-level permissions
- Resource ownership validation

### Security Middleware
- Rate limiting (general, auth, upload)
- Input sanitization and validation
- Security headers with Helmet
- CORS configuration
- Request size limiting

### Audit Logging
- All significant actions logged
- User activity tracking
- IP address and user agent logging
- Audit trail for compliance

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB service
# Windows: net start MongoDB
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

**Port Already in Use**
```bash
# Find process using port 5000
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # macOS/Linux

# Kill process or change PORT in .env
```

**JWT Secret Missing**
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Gemini API Key Invalid**
- Get API key from Google AI Studio
- Ensure key has Gemini API access
- Check API quotas and billing

### Logs and Debugging
```bash
# View application logs
tail -f logs/app.log

# View error logs
tail -f logs/error.log

# Enable debug logging
NODE_ENV=development npm run dev
```

### Database Issues
```bash
# Connect to MongoDB
mongo log-sleuth

# View collections
show collections

# Check user count
db.users.countDocuments()

# Reset admin password
db.users.updateOne(
  {email: "admin@log-sleuth.com"}, 
  {$unset: {password: 1}}
)
```

## Production Deployment

### Build for Production
```bash
npm run build
NODE_ENV=production npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure MongoDB with authentication
- Set up reverse proxy (nginx)
- Enable SSL/TLS certificates
- Configure logging and monitoring

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
```

### Health Monitoring
- `/api/health` endpoint for load balancers
- Monitor logs for errors
- Set up alerts for critical issues
- Regular database backups

## Support

For issues and questions:
1. Check this setup guide
2. Review the main README.md
3. Check application logs
4. Create an issue in the repository

## Next Steps

1. **Test the API** - Use the provided curl commands
2. **Seed sample data** - Run `npm run seed`
3. **Explore admin dashboard** - Login as admin and test endpoints
4. **Integrate with frontend** - Update frontend API URLs
5. **Configure production** - Set up proper environment variables
