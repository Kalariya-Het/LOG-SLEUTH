import { Response } from 'express';
import { User, Session } from '../models';
import { AuthUtils } from '../utils/auth';
import { ValidationUtils } from '../utils/validation';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, LoginRequest, RegisterRequest, ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest } from '../types';
import { logger } from '../config/logger';
import crypto from 'crypto';

export class AuthController {
  /**
   * Register new user
   */
  static async register(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: data, errors } = ValidationUtils.validate<RegisterRequest>(
        ValidationUtils.registerSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(data.email);
      if (existingUser) {
        ResponseUtils.conflict(res, 'User with this email already exists');
        return;
      }

      // Create new user
      const user = new User({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: 'user',
        isActive: true,
        isEmailVerified: false
      });

      await user.save();

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(user);
      const refreshToken = AuthUtils.generateRefreshToken(user);

      // Create session
      const session = new Session({
        userId: user._id,
        token: accessToken,
        refreshToken,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        isActive: true,
        expiresAt: AuthUtils.getTokenExpiration(process.env.JWT_EXPIRES_IN || '7d')
      });

      await session.save();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`New user registered: ${user.email}`);

      ResponseUtils.success(res, {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified
        },
        accessToken,
        refreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }, 'User registered successfully', 201);

    } catch (error) {
      logger.error('Registration error:', error);
      ResponseUtils.error(res, 'Registration failed');
    }
  }

  /**
   * Login user
   */
  static async login(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: data, errors } = ValidationUtils.validate<LoginRequest>(
        ValidationUtils.loginSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Find user with password
      const user = await User.findOne({ email: data.email }).select('+password +loginAttempts +lockUntil');
      if (!user) {
        ResponseUtils.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Check if account is locked
      if (user.isLocked) {
        ResponseUtils.unauthorized(res, 'Account is temporarily locked due to too many failed login attempts');
        return;
      }

      // Check if account is active
      if (!user.isActive) {
        ResponseUtils.unauthorized(res, 'Account is deactivated');
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(data.password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        ResponseUtils.unauthorized(res, 'Invalid email or password');
        return;
      }

      // Reset login attempts on successful login
      if (user.loginAttempts > 0) {
        await user.resetLoginAttempts();
      }

      // Deactivate existing sessions if not "remember me"
      if (!data.rememberMe) {
        await Session.deactivateUserSessions(user._id);
      }

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(user);
      const refreshToken = AuthUtils.generateRefreshToken(user);

      // Create new session
      const expiresIn = data.rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '7d');
      const session = new Session({
        userId: user._id,
        token: accessToken,
        refreshToken,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        isActive: true,
        expiresAt: AuthUtils.getTokenExpiration(expiresIn)
      });

      await session.save();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      ResponseUtils.success(res, {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin
        },
        accessToken,
        refreshToken,
        expiresIn
      }, 'Login successful');

    } catch (error) {
      logger.error('Login error:', error);
      ResponseUtils.error(res, 'Login failed');
    }
  }

  /**
   * Logout user
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.session) {
        req.session.isActive = false;
        await req.session.save();
      }

      logger.info(`User logged out: ${req.user?.email}`);
      ResponseUtils.success(res, null, 'Logout successful');

    } catch (error) {
      logger.error('Logout error:', error);
      ResponseUtils.error(res, 'Logout failed');
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user) {
        await Session.deactivateUserSessions(req.user._id);
      }

      logger.info(`User logged out from all devices: ${req.user?.email}`);
      ResponseUtils.success(res, null, 'Logged out from all devices');

    } catch (error) {
      logger.error('Logout all error:', error);
      ResponseUtils.error(res, 'Logout failed');
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        ResponseUtils.unauthorized(res, 'Refresh token required');
        return;
      }

      // Verify refresh token
      const payload = AuthUtils.verifyRefreshToken(refreshToken);

      // Find session
      const session = await Session.findOne({
        userId: payload.userId,
        refreshToken,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        ResponseUtils.unauthorized(res, 'Invalid or expired refresh token');
        return;
      }

      // Find user
      const user = await User.findById(payload.userId);
      if (!user || !user.isActive) {
        ResponseUtils.unauthorized(res, 'User not found or inactive');
        return;
      }

      // Generate new tokens
      const newAccessToken = AuthUtils.generateAccessToken(user);
      const newRefreshToken = AuthUtils.generateRefreshToken(user);

      // Update session
      session.token = newAccessToken;
      session.refreshToken = newRefreshToken;
      session.expiresAt = AuthUtils.getTokenExpiration(process.env.JWT_EXPIRES_IN || '7d');
      await session.save();

      ResponseUtils.success(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }, 'Token refreshed successfully');

    } catch (error) {
      logger.error('Token refresh error:', error);
      ResponseUtils.unauthorized(res, 'Token refresh failed');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      ResponseUtils.success(res, {
        id: req.user._id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        role: req.user.role,
        isEmailVerified: req.user.isEmailVerified,
        lastLogin: req.user.lastLogin,
        createdAt: req.user.createdAt
      }, 'Profile retrieved successfully');

    } catch (error) {
      logger.error('Get profile error:', error);
      ResponseUtils.error(res, 'Failed to retrieve profile');
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const { firstName, lastName } = req.body;

      // Validate input
      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      logger.info(`User profile updated: ${updatedUser.email}`);

      ResponseUtils.success(res, {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified
      }, 'Profile updated successfully');

    } catch (error) {
      logger.error('Update profile error:', error);
      ResponseUtils.error(res, 'Failed to update profile');
    }
  }

  /**
   * Change password
   */
  static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const { value: data, errors } = ValidationUtils.validate<ChangePasswordRequest>(
        ValidationUtils.changePasswordSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Get user with password
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(data.currentPassword);
      if (!isCurrentPasswordValid) {
        ResponseUtils.unauthorized(res, 'Current password is incorrect');
        return;
      }

      // Update password
      user.password = data.newPassword;
      await user.save();

      // Deactivate all sessions except current
      await Session.updateMany(
        { userId: user._id, _id: { $ne: req.session?._id } },
        { isActive: false }
      );

      logger.info(`Password changed for user: ${user.email}`);
      ResponseUtils.success(res, null, 'Password changed successfully');

    } catch (error) {
      logger.error('Change password error:', error);
      ResponseUtils.error(res, 'Failed to change password');
    }
  }

  /**
   * Forgot password
   */
  static async forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: data, errors } = ValidationUtils.validate<ForgotPasswordRequest>(
        ValidationUtils.forgotPasswordSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      const user = await User.findByEmail(data.email);
      if (!user) {
        // Don't reveal if email exists
        ResponseUtils.success(res, null, 'If the email exists, a password reset link has been sent');
        return;
      }

      // Generate reset token
      const resetToken = AuthUtils.generateRandomToken();
      const hashedToken = AuthUtils.hashToken(resetToken);

      // Save hashed token and expiration
      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // TODO: Send email with reset token
      // For now, log it (in production, implement email service)
      logger.info(`Password reset token for ${user.email}: ${resetToken}`);

      ResponseUtils.success(res, null, 'If the email exists, a password reset link has been sent');

    } catch (error) {
      logger.error('Forgot password error:', error);
      ResponseUtils.error(res, 'Failed to process password reset request');
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: data, errors } = ValidationUtils.validate<ResetPasswordRequest>(
        ValidationUtils.resetPasswordSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Hash the token to compare with stored hash
      const hashedToken = AuthUtils.hashToken(data.token);

      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() }
      }).select('+passwordResetToken +passwordResetExpires');

      if (!user) {
        ResponseUtils.unauthorized(res, 'Invalid or expired reset token');
        return;
      }

      // Update password and clear reset token
      user.password = data.newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Deactivate all sessions
      await Session.deactivateUserSessions(user._id);

      logger.info(`Password reset successful for user: ${user.email}`);
      ResponseUtils.success(res, null, 'Password reset successful');

    } catch (error) {
      logger.error('Reset password error:', error);
      ResponseUtils.error(res, 'Failed to reset password');
    }
  }

  /**
   * Verify email (placeholder for future implementation)
   */
  static async verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { token } = req.params;

      // TODO: Implement email verification logic
      ResponseUtils.success(res, null, 'Email verification not implemented yet');

    } catch (error) {
      logger.error('Email verification error:', error);
      ResponseUtils.error(res, 'Email verification failed');
    }
  }

  /**
   * Get active sessions
   */
  static async getSessions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const sessions = await Session.find({
        userId: req.user._id,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).select('-token -refreshToken').sort({ createdAt: -1 });

      ResponseUtils.success(res, sessions, 'Sessions retrieved successfully');

    } catch (error) {
      logger.error('Get sessions error:', error);
      ResponseUtils.error(res, 'Failed to retrieve sessions');
    }
  }

  /**
   * Revoke specific session
   */
  static async revokeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const { sessionId } = req.params;

      const session = await Session.findOneAndUpdate(
        { _id: sessionId, userId: req.user._id },
        { isActive: false },
        { new: true }
      );

      if (!session) {
        ResponseUtils.notFound(res, 'Session not found');
        return;
      }

      ResponseUtils.success(res, null, 'Session revoked successfully');

    } catch (error) {
      logger.error('Revoke session error:', error);
      ResponseUtils.error(res, 'Failed to revoke session');
    }
  }
}
