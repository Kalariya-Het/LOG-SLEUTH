# Log Sleuth Backend API

A comprehensive Node.js/Express backend system for log analysis with AI-powered security threat detection and operational issue identification.

## Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (User/Admin)
- Session management with device tracking
- Password reset and email verification
- Account lockout protection
- Multi-device session management

### 👥 User Management
- User registration and profile management
- Admin user management with CRUD operations
- Bulk user operations
- User analytics and activity tracking
- Account activation/deactivation

### 📊 Log Analysis
- AI-powered log analysis using Google Gemini
- Security threat detection and categorization
- Operational issue identification
- Risk level assessment
- File upload support for log files
- Analysis history and search
- Public/private analysis sharing
- Export functionality (JSON/CSV)

### 🛡️ Security Features
- Rate limiting with multiple tiers
- Input sanitization and validation
- Security headers with Helmet
- CORS configuration
- Audit logging for all actions
- Request/response monitoring
- IP-based tracking

### 📈 Admin Dashboard
- Comprehensive system statistics
- User analytics and growth metrics
- Security threat analytics
- Performance monitoring
- Audit log management
- System maintenance tools

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **AI Integration**: Google Gemini API
- **Security**: Helmet, CORS, Rate limiting
- **Logging**: Winston
- **Validation**: Joi
- **File Upload**: Multer

## Installation

1. **Clone and navigate to backend directory**
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
   Edit `.env` with your configuration values.

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

5. **Build the project**
   ```bash
   npm run build
   ```

6. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/log-sleuth` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRES_IN` | JWT expiration time | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token secret | Required |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration | `30d` |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `DEFAULT_ADMIN_EMAIL` | Default admin email | `admin@log-sleuth.com` |
| `DEFAULT_ADMIN_PASSWORD` | Default admin password | `admin123` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `MAX_FILE_SIZE` | Max upload file size | `10485760` (10MB) |

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /logout-all` - Logout from all devices
- `POST /refresh-token` - Refresh access token
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile
- `POST /change-password` - Change password
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password
- `GET /sessions` - Get active sessions
- `DELETE /sessions/:id` - Revoke session

### User Management (`/api/users`) - Admin Only
- `GET /` - Get all users
- `GET /search` - Search users
- `GET /stats` - Get system statistics
- `GET /:id` - Get user by ID
- `PUT /:id` - Update user
- `DELETE /:id` - Delete user
- `GET /:id/history` - Get user's analysis history
- `POST /bulk-operation` - Bulk user operations

### Log Analysis (`/api/history`)
- `POST /` - Create new analysis
- `GET /` - Get user's analysis history
- `GET /public` - Get public analyses
- `GET /search` - Search analyses
- `GET /stats` - Get analysis statistics
- `GET /:id` - Get analysis by ID
- `PUT /:id` - Update analysis
- `DELETE /:id` - Delete analysis
- `GET /:id/export` - Export analysis
- `POST /bulk-delete` - Bulk delete analyses

### Admin Dashboard (`/api/admin`) - Admin Only
- `GET /dashboard/stats` - Dashboard statistics
- `GET /analytics/users` - User analytics
- `GET /analytics/security` - Security analytics
- `GET /analytics/performance` - Performance metrics
- `GET /audit-logs` - Audit logs
- `POST /maintenance` - System maintenance

### System
- `GET /api/health` - Health check
- `GET /api/` - API information

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Token Flow
1. Login with email/password to get access and refresh tokens
2. Use access token for API requests
3. When access token expires, use refresh token to get new tokens
4. Refresh tokens are long-lived and stored securely

## Rate Limiting

Different endpoints have different rate limits:
- **General**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **Password Reset**: 3 attempts per hour
- **File Upload**: 10 uploads per 15 minutes

## Security Features

### Input Validation
All inputs are validated using Joi schemas with comprehensive error messages.

### Audit Logging
All significant actions are logged with:
- User ID and action performed
- IP address and user agent
- Request details and timestamps
- Resource affected

### Session Management
- Multiple active sessions per user
- Device and location tracking
- Session revocation capabilities
- Automatic cleanup of expired sessions

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Log Analysis

The system uses Google Gemini AI to analyze log files and provides:

### Security Threat Detection
- Severity levels: Critical, High, Medium, Low, Informational
- Threat categorization and risk scoring
- Actionable recommendations
- Timeline analysis

### Operational Issue Identification
- Issue types: Error, Warning, Performance, Info
- Impact assessment and categorization
- Resolution recommendations
- Performance metrics

### Analysis Metadata
- Processing time and performance stats
- Log size and lines analyzed
- Risk level assessment
- Threat and issue counts

## Development

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Database models
├── routes/          # API routes
├── services/        # External services
├── types/           # TypeScript types
├── utils/           # Utility functions
└── server.ts        # Main server file
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

### Database Models
- **User**: User accounts and authentication
- **Session**: Active user sessions
- **HistoryEntry**: Log analysis records
- **AuditLog**: System audit trail

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure MongoDB with authentication
4. Set up proper logging and monitoring
5. Configure reverse proxy (nginx)
6. Enable SSL/TLS

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["npm", "start"]
```

## Monitoring

### Health Checks
- `/api/health` endpoint for load balancer checks
- Database connectivity verification
- Service dependency checks

### Logging
- Structured logging with Winston
- Request/response logging
- Error tracking and alerting
- Performance metrics

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Include input validation
4. Write unit tests for new features
5. Update API documentation
6. Follow security guidelines

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the audit logs for debugging
