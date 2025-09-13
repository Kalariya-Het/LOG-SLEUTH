import { Router } from 'express';
import multer from 'multer';
import { HistoryController } from '../controllers/historyController';
import { authenticate, optionalAuth, rateLimitByUser } from '../middleware/auth';
import { uploadRateLimit, auditLog } from '../middleware/security';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow text files and log files
    const allowedMimes = [
      'text/plain',
      'text/log',
      'application/octet-stream',
      'text/x-log'
    ];
    
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(log|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only log and text files are allowed'));
    }
  }
});

// Public routes
router.get('/public', optionalAuth, HistoryController.getPublicAnalyses);

// Protected routes
router.post('/', authenticate, uploadRateLimit, upload.single('logFile'), rateLimitByUser(10, 15 * 60 * 1000), auditLog('CREATE_ANALYSIS', 'HistoryEntry'), HistoryController.createAnalysis);
router.get('/', authenticate, HistoryController.getUserHistory);
router.get('/search', authenticate, HistoryController.searchAnalyses);
router.get('/stats', authenticate, HistoryController.getAnalysisStats);
router.post('/bulk-delete', authenticate, auditLog('BULK_DELETE_ANALYSES', 'HistoryEntry'), HistoryController.bulkDeleteAnalyses);

router.get('/:id', optionalAuth, HistoryController.getAnalysisById);
router.put('/:id', authenticate, auditLog('UPDATE_ANALYSIS', 'HistoryEntry'), HistoryController.updateAnalysis);
router.delete('/:id', authenticate, auditLog('DELETE_ANALYSIS', 'HistoryEntry'), HistoryController.deleteAnalysis);
router.get('/:id/export', authenticate, auditLog('EXPORT_ANALYSIS', 'HistoryEntry'), HistoryController.exportAnalysis);

export default router;
