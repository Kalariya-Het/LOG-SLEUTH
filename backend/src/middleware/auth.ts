import { Request, Response, NextFunction } from 'express';
import { User, Session } from '../models';
import { AuthUtils } from '../utils/auth';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { logger } from '../config/logger';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      ResponseUtils.unauthorized(res, 'Access token required');
      return;
    }

    // Verify token
    const payload = AuthUtils.verifyAccessToken(token);
    
    // Find user
    const user = await User.findById(payload.userId);
    if (!user) {
      ResponseUtils.unauthorized(res, 'User not found');
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      ResponseUtils.unauthorized(res, 'Account is deactivated');
      return;
    }

    // Check if user account is locked
    if (user.isLocked) {
      ResponseUtils.unauthorized(res, 'Account is temporarily locked');
      return;
    }

    // Find active session
    const session = await Session.findOne({
      userId: user._id,
      token,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      ResponseUtils.unauthorized(res, 'Invalid or expired session');
      return;
    }

    // Attach user and session to request
    req.user = user;
    req.session = session;

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    ResponseUtils.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ResponseUtils.unauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      ResponseUtils.forbidden(res, 'Insufficient permissions');
      return;
    }

    next();
  };
};

/**
 * Admin authorization middleware
 */
export const requireAdmin = authorize('admin');

/**
 * Optional authentication middleware
 * Attaches user if token is provided but doesn't fail if not
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = AuthUtils.extractTokenFromHeader(req.headers.authorization);
    
    if (token) {
      const payload = AuthUtils.verifyAccessToken(token);
      const user = await User.findById(payload.userId);
      
      if (user && user.isActive && !user.isLocked) {
        const session = await Session.findOne({
          userId: user._id,
          token,
          isActive: true,
          expiresAt: { $gt: new Date() }
        });

        if (session) {
          req.user = user;
          req.session = session;
        }
      }
    }

    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

/**
 * Rate limiting by user
 */
export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const userRequests = new Map<string, { count: number; resetTime: number }>();

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user?._id || req.ip;
    const now = Date.now();
    
    const userLimit = userRequests.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      userRequests.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }
    
    if (userLimit.count >= maxRequests) {
      ResponseUtils.tooManyRequests(res, 'Rate limit exceeded');
      return;
    }
    
    userLimit.count++;
    next();
  };
};
