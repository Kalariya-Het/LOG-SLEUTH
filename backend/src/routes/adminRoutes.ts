import { Router } from 'express';
import { AdminController } from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { auditLog } from '../middleware/security';

const router = Router();

// All admin routes require admin authentication
router.use(authenticate, requireAdmin);

// Dashboard and analytics
router.get('/dashboard/stats', AdminController.getDashboardStats);
router.get('/analytics/users', AdminController.getUserAnalytics);
router.get('/analytics/security', AdminController.getSecurityAnalytics);
router.get('/analytics/performance', AdminController.getPerformanceMetrics);

// Audit and monitoring
router.get('/audit-logs', AdminController.getAuditLogs);

// System maintenance
router.post('/maintenance', auditLog('SYSTEM_MAINTENANCE', 'System'), AdminController.performMaintenance);

export default router;
