import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ResponseUtils } from '../utils/response';
import { AuditLog } from '../models';
import { AuthenticatedRequest } from '../types';
import { logger } from '../config/logger';

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * General rate limiting
 */
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiting for auth endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Password reset rate limiting
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later.',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File upload rate limiting
 */
export const uploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per window
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    timestamp: new Date()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/[<>]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Audit logging middleware
 */
export const auditLog = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const originalSend = res.send;
      let responseBody: any;

      // Capture response
      res.send = function(body: any) {
        responseBody = body;
        return originalSend.call(this, body);
      };

      // Continue with request
      next();

      // Log after response
      res.on('finish', async () => {
        try {
          const auditEntry = new AuditLog({
            userId: req.user?._id,
            action,
            resource,
            resourceId: req.params.id,
            details: {
              method: req.method,
              url: req.originalUrl,
              statusCode: res.statusCode,
              userAgent: req.get('User-Agent'),
              body: req.method !== 'GET' ? req.body : undefined
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });

          await auditEntry.save();
        } catch (error) {
          logger.error('Audit logging error:', error);
        }
      });
    } catch (error) {
      logger.error('Audit middleware error:', error);
      next();
    }
  };
};

/**
 * Request validation middleware
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        ResponseUtils.error(res, 'Invalid content type', 415);
        return;
      }
    }
    
    next();
  };
};

/**
 * Request size limiting middleware
 */
export const limitRequestSize = (maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      ResponseUtils.error(res, 'Request too large', 413);
      return;
    }
    
    next();
  };
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

/**
 * Error handling middleware
 */
export const errorHandler = (error: any, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message
    }));
    ResponseUtils.validationError(res, errors);
    return;
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    ResponseUtils.conflict(res, `${field} already exists`);
    return;
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    ResponseUtils.unauthorized(res, 'Invalid token');
    return;
  }

  if (error.name === 'TokenExpiredError') {
    ResponseUtils.unauthorized(res, 'Token expired');
    return;
  }

  // Default error
  ResponseUtils.error(res, 'Internal server error', 500);
};
