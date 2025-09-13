import { Response } from 'express';
import { User, HistoryEntry, AuditLog, Session } from '../models';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, AdminStats } from '../types';
import { logger } from '../config/logger';

export class AdminController {
  /**
   * Get comprehensive admin dashboard statistics
   */
  static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        // User statistics
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        usersByRole,
        
        // Analysis statistics
        totalAnalyses,
        analysesToday,
        analysesThisWeek,
        analysesThisMonth,
        analysesByRiskLevel,
        
        // Security statistics
        totalThreats,
        criticalThreats,
        highThreats,
        threatsToday,
        
        // System statistics
        activeSessions,
        recentAuditLogs,
        systemHealth
      ] = await Promise.all([
        // User queries
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ createdAt: { $gte: today } }),
        User.countDocuments({ createdAt: { $gte: thisWeek } }),
        User.aggregate([
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]),
        
        // Analysis queries
        HistoryEntry.countDocuments(),
        HistoryEntry.countDocuments({ createdAt: { $gte: today } }),
        HistoryEntry.countDocuments({ createdAt: { $gte: thisWeek } }),
        HistoryEntry.countDocuments({ createdAt: { $gte: thisMonth } }),
        HistoryEntry.aggregate([
          { $group: { _id: '$analysis.overallRiskLevel', count: { $sum: 1 } } }
        ]),
        
        // Security queries
        HistoryEntry.aggregate([
          { $group: { _id: null, total: { $sum: '$analysis.totalThreats' } } }
        ]),
        HistoryEntry.countDocuments({ 'analysis.overallRiskLevel': 'Critical' }),
        HistoryEntry.countDocuments({ 'analysis.overallRiskLevel': 'High' }),
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: '$analysis.totalThreats' } } }
        ]),
        
        // System queries
        Session.countDocuments({ isActive: true, expiresAt: { $gt: now } }),
        AuditLog.find().sort({ timestamp: -1 }).limit(10).populate('userId', 'email'),
        AdminController.calculateSystemHealth()
      ]);

      const stats: AdminStats & any = {
        // User metrics
        totalUsers,
        activeUsers,
        newUsersToday,
        newUsersThisWeek,
        usersByRole: usersByRole.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        
        // Analysis metrics
        totalAnalyses,
        analysesToday,
        analysesThisWeek,
        analysesThisMonth,
        analysesByRiskLevel: analysesByRiskLevel.reduce((acc: any, item: any) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        
        // Security metrics
        securityThreatsFound: totalThreats[0]?.total || 0,
        criticalThreats,
        highThreats,
        threatsToday: threatsToday[0]?.total || 0,
        
        // System metrics
        activeSessions,
        systemHealth,
        recentActivity: recentAuditLogs,
        
        // Growth metrics
        userGrowthRate: AdminController.calculateGrowthRate(newUsersThisWeek, totalUsers),
        analysisGrowthRate: AdminController.calculateGrowthRate(analysesThisWeek, totalAnalyses),
        
        // Performance metrics
        avgAnalysesPerUser: totalUsers > 0 ? Math.round(totalAnalyses / totalUsers * 100) / 100 : 0,
        
        // Timestamps
        lastUpdated: now
      };

      ResponseUtils.success(res, stats, 'Dashboard statistics retrieved successfully');

    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      ResponseUtils.error(res, 'Failed to retrieve dashboard statistics');
    }
  }

  /**
   * Get detailed user analytics
   */
  static async getUserAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '30d';
      const dateRange = AdminController.getDateRange(timeframe);

      const [
        userRegistrations,
        userActivity,
        topActiveUsers,
        usersByLocation,
        deviceStats
      ] = await Promise.all([
        // User registrations over time
        User.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),
        
        // User activity (analyses created)
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),
        
        // Top active users
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          { $group: { _id: '$userId', analysisCount: { $sum: 1 } } },
          { $sort: { analysisCount: -1 } },
          { $limit: 10 },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
          {
            $project: {
              userId: '$_id',
              email: '$user.email',
              firstName: '$user.firstName',
              lastName: '$user.lastName',
              analysisCount: 1
            }
          }
        ]),
        
        // Users by location (placeholder - would need IP geolocation)
        Promise.resolve([]),
        
        // Device/browser stats from sessions
        Session.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: '$userAgent',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
      ]);

      const analytics = {
        timeframe,
        dateRange,
        userRegistrations,
        userActivity,
        topActiveUsers,
        usersByLocation,
        deviceStats
      };

      ResponseUtils.success(res, analytics, 'User analytics retrieved successfully');

    } catch (error) {
      logger.error('Get user analytics error:', error);
      ResponseUtils.error(res, 'Failed to retrieve user analytics');
    }
  }

  /**
   * Get security analytics
   */
  static async getSecurityAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '30d';
      const dateRange = AdminController.getDateRange(timeframe);

      const [
        threatTrends,
        threatsByCategory,
        riskLevelDistribution,
        securityEvents,
        failedLogins,
        suspiciousActivity
      ] = await Promise.all([
        // Threat trends over time
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' }
              },
              totalThreats: { $sum: '$analysis.totalThreats' },
              criticalThreats: {
                $sum: {
                  $size: {
                    $filter: {
                      input: '$analysis.securityThreats',
                      cond: { $eq: ['$$this.severity', 'Critical'] }
                    }
                  }
                }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
        ]),
        
        // Threats by category
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          { $unwind: '$analysis.securityThreats' },
          {
            $group: {
              _id: '$analysis.securityThreats.category',
              count: { $sum: 1 },
              avgRiskScore: { $avg: '$analysis.securityThreats.riskScore' }
            }
          },
          { $sort: { count: -1 } }
        ]),
        
        // Risk level distribution
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: '$analysis.overallRiskLevel',
              count: { $sum: 1 },
              percentage: { $sum: 1 }
            }
          }
        ]),
        
        // Security events from audit logs
        AuditLog.aggregate([
          {
            $match: {
              timestamp: { $gte: dateRange.start },
              action: { $in: ['LOGIN', 'FAILED_LOGIN', 'LOGOUT', 'CHANGE_PASSWORD'] }
            }
          },
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Failed login attempts (placeholder)
        Promise.resolve([]),
        
        // Suspicious activity indicators
        AuditLog.aggregate([
          {
            $match: {
              timestamp: { $gte: dateRange.start },
              $or: [
                { action: { $regex: 'BULK_', $options: 'i' } },
                { action: 'DELETE_USER' },
                { action: 'UPDATE_USER' }
              ]
            }
          },
          {
            $group: {
              _id: '$userId',
              suspiciousActions: { $sum: 1 },
              actions: { $push: '$action' }
            }
          },
          { $match: { suspiciousActions: { $gte: 5 } } },
          { $sort: { suspiciousActions: -1 } },
          { $limit: 10 }
        ])
      ]);

      const analytics = {
        timeframe,
        dateRange,
        threatTrends,
        threatsByCategory,
        riskLevelDistribution,
        securityEvents,
        failedLogins,
        suspiciousActivity
      };

      ResponseUtils.success(res, analytics, 'Security analytics retrieved successfully');

    } catch (error) {
      logger.error('Get security analytics error:', error);
      ResponseUtils.error(res, 'Failed to retrieve security analytics');
    }
  }

  /**
   * Get system performance metrics
   */
  static async getPerformanceMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const timeframe = req.query.timeframe as string || '24h';
      const dateRange = AdminController.getDateRange(timeframe);

      const [
        analysisPerformance,
        systemLoad,
        errorRates,
        responseTimeStats
      ] = await Promise.all([
        // Analysis processing performance
        HistoryEntry.aggregate([
          { $match: { createdAt: { $gte: dateRange.start } } },
          {
            $group: {
              _id: null,
              avgProcessingTime: { $avg: '$analysis.analysisMetadata.processingTime' },
              minProcessingTime: { $min: '$analysis.analysisMetadata.processingTime' },
              maxProcessingTime: { $max: '$analysis.analysisMetadata.processingTime' },
              totalAnalyses: { $sum: 1 }
            }
          }
        ]),
        
        // System load indicators
        Promise.resolve({
          cpuUsage: Math.random() * 100, // Placeholder
          memoryUsage: Math.random() * 100, // Placeholder
          diskUsage: Math.random() * 100 // Placeholder
        }),
        
        // Error rates from audit logs
        AuditLog.aggregate([
          { $match: { timestamp: { $gte: dateRange.start } } },
          {
            $group: {
              _id: {
                $cond: {
                  if: { $regexMatch: { input: '$details.statusCode', regex: /^[45]/ } },
                  then: 'error',
                  else: 'success'
                }
              },
              count: { $sum: 1 }
            }
          }
        ]),
        
        // Response time statistics (placeholder)
        Promise.resolve({
          avg: Math.random() * 1000,
          p95: Math.random() * 2000,
          p99: Math.random() * 5000
        })
      ]);

      const metrics = {
        timeframe,
        dateRange,
        analysisPerformance: analysisPerformance[0] || {
          avgProcessingTime: 0,
          minProcessingTime: 0,
          maxProcessingTime: 0,
          totalAnalyses: 0
        },
        systemLoad,
        errorRates,
        responseTimeStats
      };

      ResponseUtils.success(res, metrics, 'Performance metrics retrieved successfully');

    } catch (error) {
      logger.error('Get performance metrics error:', error);
      ResponseUtils.error(res, 'Failed to retrieve performance metrics');
    }
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string;
      const userId = req.query.userId as string;
      const resource = req.query.resource as string;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      // Build query
      const query: any = {};
      if (action) query.action = { $regex: action, $options: 'i' };
      if (userId) query.userId = userId;
      if (resource) query.resource = { $regex: resource, $options: 'i' };
      if (dateFrom || dateTo) {
        query.timestamp = {};
        if (dateFrom) query.timestamp.$gte = dateFrom;
        if (dateTo) query.timestamp.$lte = dateTo;
      }

      const skip = (page - 1) * limit;
      const auditLogs = await AuditLog.find(query)
        .populate('userId', 'email firstName lastName')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const total = await AuditLog.countDocuments(query);

      ResponseUtils.paginated(res, auditLogs, page, limit, total, 'Audit logs retrieved successfully');

    } catch (error) {
      logger.error('Get audit logs error:', error);
      ResponseUtils.error(res, 'Failed to retrieve audit logs');
    }
  }

  /**
   * System maintenance operations
   */
  static async performMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { operation } = req.body;

      let result;
      switch (operation) {
        case 'cleanup_expired_sessions':
          result = await Session.deleteMany({
            $or: [
              { expiresAt: { $lt: new Date() } },
              { isActive: false }
            ]
          });
          break;
          
        case 'cleanup_old_audit_logs':
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          result = await AuditLog.deleteMany({ timestamp: { $lt: thirtyDaysAgo } });
          break;
          
        case 'reset_failed_login_attempts':
          result = await User.updateMany(
            { loginAttempts: { $gt: 0 } },
            { $unset: { loginAttempts: 1, lockUntil: 1 } }
          );
          break;
          
        default:
          ResponseUtils.error(res, 'Invalid maintenance operation', 400);
          return;
      }

      // Log maintenance action
      await new AuditLog({
        userId: req.user?._id,
        action: `MAINTENANCE_${operation.toUpperCase()}`,
        resource: 'System',
        details: { operation, result },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      ResponseUtils.success(res, result, `Maintenance operation '${operation}' completed successfully`);

    } catch (error) {
      logger.error('Perform maintenance error:', error);
      ResponseUtils.error(res, 'Maintenance operation failed');
    }
  }

  /**
   * Helper method to calculate system health
   */
  private static async calculateSystemHealth(): Promise<'Good' | 'Warning' | 'Critical'> {
    try {
      const [
        inactiveUsers,
        criticalThreatsToday,
        errorLogsToday
      ] = await Promise.all([
        User.countDocuments({ isActive: false }),
        HistoryEntry.countDocuments({
          'analysis.overallRiskLevel': 'Critical',
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        AuditLog.countDocuments({
          timestamp: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          'details.statusCode': { $gte: 500 }
        })
      ]);

      if (criticalThreatsToday > 10 || errorLogsToday > 50) {
        return 'Critical';
      }
      
      if (criticalThreatsToday > 5 || errorLogsToday > 20 || inactiveUsers > 100) {
        return 'Warning';
      }
      
      return 'Good';
    } catch (error) {
      return 'Warning';
    }
  }

  /**
   * Helper method to calculate growth rate
   */
  private static calculateGrowthRate(recent: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((recent / total) * 100 * 100) / 100;
  }

  /**
   * Helper method to get date range based on timeframe
   */
  private static getDateRange(timeframe: string): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;

    switch (timeframe) {
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end: now };
  }
}
