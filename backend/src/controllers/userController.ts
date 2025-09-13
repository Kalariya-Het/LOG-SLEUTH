import { Response } from 'express';
import { User, HistoryEntry, AuditLog } from '../models';
import { ValidationUtils } from '../utils/validation';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, UserManagementRequest, SearchQuery } from '../types';
import { logger } from '../config/logger';

export class UserController {
  /**
   * Get all users (Admin only)
   */
  static async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const isActive = req.query.isActive as string;

      // Build query
      const query: any = {};
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ];
      }
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      // Get users with pagination
      const skip = (page - 1) * limit;
      const users = await User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      // Get user statistics
      const userStats = await Promise.all(
        users.map(async (user) => {
          const analysisCount = await HistoryEntry.countDocuments({ userId: user._id });
          const lastAnalysis = await HistoryEntry.findOne({ userId: user._id })
            .sort({ createdAt: -1 })
            .select('createdAt');

          return {
            ...user.toJSON(),
            stats: {
              totalAnalyses: analysisCount,
              lastAnalysis: lastAnalysis?.createdAt || null
            }
          };
        })
      );

      ResponseUtils.paginated(res, userStats, page, limit, total, 'Users retrieved successfully');

    } catch (error) {
      logger.error('Get all users error:', error);
      ResponseUtils.error(res, 'Failed to retrieve users');
    }
  }

  /**
   * Get user by ID (Admin only)
   */
  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!ValidationUtils.isValidObjectId(userId)) {
        ResponseUtils.error(res, 'Invalid user ID', 400);
        return;
      }

      const user = await User.findById(userId).select('-password');
      if (!user) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Get user statistics
      const [analysisCount, totalThreats, totalIssues, lastAnalysis] = await Promise.all([
        HistoryEntry.countDocuments({ userId }),
        HistoryEntry.aggregate([
          { $match: { userId } },
          { $group: { _id: null, total: { $sum: '$analysis.totalThreats' } } }
        ]),
        HistoryEntry.aggregate([
          { $match: { userId } },
          { $group: { _id: null, total: { $sum: '$analysis.totalIssues' } } }
        ]),
        HistoryEntry.findOne({ userId }).sort({ createdAt: -1 }).select('createdAt analysis.overallRiskLevel')
      ]);

      const userWithStats = {
        ...user.toJSON(),
        stats: {
          totalAnalyses: analysisCount,
          totalThreats: totalThreats[0]?.total || 0,
          totalIssues: totalIssues[0]?.total || 0,
          lastAnalysis: lastAnalysis?.createdAt || null,
          lastRiskLevel: lastAnalysis?.analysis?.overallRiskLevel || null
        }
      };

      ResponseUtils.success(res, userWithStats, 'User retrieved successfully');

    } catch (error) {
      logger.error('Get user by ID error:', error);
      ResponseUtils.error(res, 'Failed to retrieve user');
    }
  }

  /**
   * Update user (Admin only)
   */
  static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!ValidationUtils.isValidObjectId(userId)) {
        ResponseUtils.error(res, 'Invalid user ID', 400);
        return;
      }

      const { value: data, errors } = ValidationUtils.validate<UserManagementRequest>(
        ValidationUtils.userUpdateSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Prevent admin from deactivating themselves
      if (userId === req.user?._id && data.isActive === false) {
        ResponseUtils.error(res, 'Cannot deactivate your own account', 400);
        return;
      }

      // Prevent changing role of the last admin
      if (data.role === 'user') {
        const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
        const currentUser = await User.findById(userId);
        if (currentUser?.role === 'admin' && adminCount <= 1) {
          ResponseUtils.error(res, 'Cannot change role of the last admin', 400);
          return;
        }
      }

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        data,
        { new: true, runValidators: true }
      ).select('-password');

      if (!updatedUser) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'UPDATE_USER',
        resource: 'User',
        resourceId: userId,
        details: { changes: data },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      logger.info(`User updated by admin: ${updatedUser.email}`);
      ResponseUtils.success(res, updatedUser, 'User updated successfully');

    } catch (error) {
      logger.error('Update user error:', error);
      ResponseUtils.error(res, 'Failed to update user');
    }
  }

  /**
   * Delete user (Admin only)
   */
  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!ValidationUtils.isValidObjectId(userId)) {
        ResponseUtils.error(res, 'Invalid user ID', 400);
        return;
      }

      // Prevent admin from deleting themselves
      if (userId === req.user?._id) {
        ResponseUtils.error(res, 'Cannot delete your own account', 400);
        return;
      }

      // Prevent deleting the last admin
      const userToDelete = await User.findById(userId);
      if (userToDelete?.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
        if (adminCount <= 1) {
          ResponseUtils.error(res, 'Cannot delete the last admin', 400);
          return;
        }
      }

      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        ResponseUtils.notFound(res, 'User not found');
        return;
      }

      // Delete user's history entries
      await HistoryEntry.deleteMany({ userId });

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'DELETE_USER',
        resource: 'User',
        resourceId: userId,
        details: { deletedUser: { email: deletedUser.email, role: deletedUser.role } },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      logger.info(`User deleted by admin: ${deletedUser.email}`);
      ResponseUtils.success(res, null, 'User deleted successfully');

    } catch (error) {
      logger.error('Delete user error:', error);
      ResponseUtils.error(res, 'Failed to delete user');
    }
  }

  /**
   * Get user's analysis history
   */
  static async getUserHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      // Check if user can access this history
      const canAccess = req.user?.role === 'admin' || req.user?._id === userId;
      if (!canAccess) {
        ResponseUtils.forbidden(res, 'Access denied');
        return;
      }

      if (!ValidationUtils.isValidObjectId(userId)) {
        ResponseUtils.error(res, 'Invalid user ID', 400);
        return;
      }

      const skip = (page - 1) * limit;
      const history = await HistoryEntry.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-logContent'); // Exclude large log content for list view

      const total = await HistoryEntry.countDocuments({ userId });

      ResponseUtils.paginated(res, history, page, limit, total, 'User history retrieved successfully');

    } catch (error) {
      logger.error('Get user history error:', error);
      ResponseUtils.error(res, 'Failed to retrieve user history');
    }
  }

  /**
   * Get system statistics (Admin only)
   */
  static async getSystemStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalAnalyses,
        analysesToday,
        userStats,
        threatStats,
        recentActivity
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        HistoryEntry.countDocuments(),
        HistoryEntry.countDocuments({
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        User.aggregate([
          {
            $group: {
              _id: '$role',
              count: { $sum: 1 }
            }
          }
        ]),
        HistoryEntry.aggregate([
          {
            $group: {
              _id: '$analysis.overallRiskLevel',
              count: { $sum: 1 },
              totalThreats: { $sum: '$analysis.totalThreats' },
              totalIssues: { $sum: '$analysis.totalIssues' }
            }
          }
        ]),
        HistoryEntry.find()
          .populate('userId', 'email firstName lastName')
          .sort({ createdAt: -1 })
          .limit(10)
          .select('userId createdAt analysis.overallRiskLevel analysis.totalThreats analysis.totalIssues')
      ]);

      const stats = {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: userStats.reduce((acc: any, stat: any) => {
            acc[stat._id] = stat.count;
            return acc;
          }, {})
        },
        analyses: {
          total: totalAnalyses,
          today: analysesToday,
          byRiskLevel: threatStats.reduce((acc: any, stat: any) => {
            acc[stat._id] = {
              count: stat.count,
              totalThreats: stat.totalThreats,
              totalIssues: stat.totalIssues
            };
            return acc;
          }, {})
        },
        recentActivity
      };

      ResponseUtils.success(res, stats, 'System statistics retrieved successfully');

    } catch (error) {
      logger.error('Get system stats error:', error);
      ResponseUtils.error(res, 'Failed to retrieve system statistics');
    }
  }

  /**
   * Search users (Admin only)
   */
  static async searchUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: searchParams, errors } = ValidationUtils.validate<SearchQuery>(
        ValidationUtils.searchSchema,
        req.query
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      const query: any = {};
      
      if (searchParams.q) {
        query.$or = [
          { email: { $regex: searchParams.q, $options: 'i' } },
          { firstName: { $regex: searchParams.q, $options: 'i' } },
          { lastName: { $regex: searchParams.q, $options: 'i' } }
        ];
      }

      if (searchParams.dateFrom || searchParams.dateTo) {
        query.createdAt = {};
        if (searchParams.dateFrom) query.createdAt.$gte = searchParams.dateFrom;
        if (searchParams.dateTo) query.createdAt.$lte = searchParams.dateTo;
      }

      const skip = (searchParams.page - 1) * searchParams.limit;
      const users = await User.find(query)
        .select('-password')
        .sort({ [searchParams.sortBy]: searchParams.sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(searchParams.limit);

      const total = await User.countDocuments(query);

      ResponseUtils.paginated(
        res,
        users,
        searchParams.page,
        searchParams.limit,
        total,
        'User search completed successfully'
      );

    } catch (error) {
      logger.error('Search users error:', error);
      ResponseUtils.error(res, 'Failed to search users');
    }
  }

  /**
   * Bulk user operations (Admin only)
   */
  static async bulkUserOperation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { action, userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        ResponseUtils.error(res, 'User IDs array is required', 400);
        return;
      }

      // Validate all user IDs
      const invalidIds = userIds.filter(id => !ValidationUtils.isValidObjectId(id));
      if (invalidIds.length > 0) {
        ResponseUtils.error(res, 'Invalid user IDs provided', 400);
        return;
      }

      let result;
      switch (action) {
        case 'activate':
          result = await User.updateMany(
            { _id: { $in: userIds } },
            { isActive: true }
          );
          break;
        case 'deactivate':
          // Prevent deactivating current admin
          const filteredIds = userIds.filter(id => id !== req.user?._id);
          result = await User.updateMany(
            { _id: { $in: filteredIds } },
            { isActive: false }
          );
          break;
        case 'delete':
          // Prevent deleting current admin and ensure at least one admin remains
          const filteredDeleteIds = userIds.filter(id => id !== req.user?._id);
          const adminsToDelete = await User.countDocuments({
            _id: { $in: filteredDeleteIds },
            role: 'admin'
          });
          const totalAdmins = await User.countDocuments({ role: 'admin', isActive: true });
          
          if (adminsToDelete >= totalAdmins) {
            ResponseUtils.error(res, 'Cannot delete all admins', 400);
            return;
          }
          
          result = await User.deleteMany({ _id: { $in: filteredDeleteIds } });
          // Also delete their history
          await HistoryEntry.deleteMany({ userId: { $in: filteredDeleteIds } });
          break;
        default:
          ResponseUtils.error(res, 'Invalid action', 400);
          return;
      }

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: `BULK_${action.toUpperCase()}_USERS`,
        resource: 'User',
        details: { userIds, action, result },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      ResponseUtils.success(res, result, `Bulk ${action} operation completed successfully`);

    } catch (error) {
      logger.error('Bulk user operation error:', error);
      ResponseUtils.error(res, 'Bulk operation failed');
    }
  }
}
