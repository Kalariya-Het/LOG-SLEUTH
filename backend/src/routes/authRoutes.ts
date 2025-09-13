import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { authRateLimit, passwordResetRateLimit, auditLog } from '../middleware/security';

const router = Router();

// Public routes with rate limiting
router.post('/register', authRateLimit, auditLog('REGISTER', 'User'), AuthController.register);
router.post('/login', authRateLimit, auditLog('LOGIN', 'User'), AuthController.login);
router.post('/refresh-token', authRateLimit, AuthController.refreshToken);
router.post('/forgot-password', passwordResetRateLimit, auditLog('FORGOT_PASSWORD', 'User'), AuthController.forgotPassword);
router.post('/reset-password', passwordResetRateLimit, auditLog('RESET_PASSWORD', 'User'), AuthController.resetPassword);
router.get('/verify-email/:token', AuthController.verifyEmail);

// Protected routes
router.post('/logout', authenticate, auditLog('LOGOUT', 'User'), AuthController.logout);
router.post('/logout-all', authenticate, auditLog('LOGOUT_ALL', 'User'), AuthController.logoutAll);
router.get('/profile', authenticate, AuthController.getProfile);
router.put('/profile', authenticate, auditLog('UPDATE_PROFILE', 'User'), AuthController.updateProfile);
router.post('/change-password', authenticate, auditLog('CHANGE_PASSWORD', 'User'), AuthController.changePassword);
router.get('/sessions', authenticate, AuthController.getSessions);
router.delete('/sessions/:sessionId', authenticate, auditLog('REVOKE_SESSION', 'Session'), AuthController.revokeSession);

export default router;
