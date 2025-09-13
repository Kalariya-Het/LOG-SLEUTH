import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { auditLog } from '../middleware/security';

const router = Router();

// Admin only routes
router.get('/', authenticate, requireAdmin, UserController.getAllUsers);
router.get('/search', authenticate, requireAdmin, UserController.searchUsers);
router.get('/stats', authenticate, requireAdmin, UserController.getSystemStats);
router.post('/bulk-operation', authenticate, requireAdmin, auditLog('BULK_USER_OPERATION', 'User'), UserController.bulkUserOperation);

router.get('/:userId', authenticate, requireAdmin, UserController.getUserById);
router.put('/:userId', authenticate, requireAdmin, auditLog('UPDATE_USER', 'User'), UserController.updateUser);
router.delete('/:userId', authenticate, requireAdmin, auditLog('DELETE_USER', 'User'), UserController.deleteUser);
router.get('/:userId/history', authenticate, UserController.getUserHistory);

export default router;
