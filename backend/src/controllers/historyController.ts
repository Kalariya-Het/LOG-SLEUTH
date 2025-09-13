import { Response } from 'express';
import { HistoryEntry, AuditLog } from '../models';
import { ValidationUtils } from '../utils/validation';
import { ResponseUtils } from '../utils/response';
import { AuthenticatedRequest, SearchQuery } from '../types';
import { logger } from '../config/logger';
import { geminiService } from '../services/geminiService';

export class HistoryController {
  /**
   * Create new log analysis
   */
  static async createAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const { value: data, errors } = ValidationUtils.validate(
        ValidationUtils.logAnalysisSchema,
        req.body
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Analyze the log content using Gemini
      const startTime = Date.now();
      const analysis = await geminiService.analyzeLog(data.logContent);
      const processingTime = Date.now() - startTime;

      // Create history entry
      const historyEntry = new HistoryEntry({
        userId: req.user._id,
        title: data.title || `Log Analysis - ${new Date().toLocaleDateString()}`,
        logContent: data.logContent,
        analysis: {
          ...analysis,
          analysisMetadata: {
            processingTime,
            logSize: data.logContent.length,
            linesAnalyzed: data.logContent.split('\n').length
          }
        },
        tags: data.tags || [],
        isPublic: data.isPublic || false,
        fileMetadata: req.file ? {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        } : undefined
      });

      await historyEntry.save();

      // Log audit trail
      await new AuditLog({
        userId: req.user._id,
        action: 'CREATE_ANALYSIS',
        resource: 'HistoryEntry',
        resourceId: historyEntry._id,
        details: {
          title: historyEntry.title,
          logSize: data.logContent.length,
          threatsFound: analysis.totalThreats,
          issuesFound: analysis.totalIssues,
          riskLevel: analysis.overallRiskLevel
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      logger.info(`New analysis created by user: ${req.user.email}, ID: ${historyEntry._id}`);

      ResponseUtils.success(res, historyEntry, 'Log analysis completed successfully', 201);

    } catch (error) {
      logger.error('Create analysis error:', error);
      ResponseUtils.error(res, 'Failed to analyze log');
    }
  }

  /**
   * Get user's analysis history
   */
  static async getUserHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        ResponseUtils.unauthorized(res, 'User not authenticated');
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;
      const riskLevel = req.query.riskLevel as string;
      const tags = req.query.tags as string;

      // Build query
      const query: any = { userId: req.user._id };
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'analysis.summary': { $regex: search, $options: 'i' } }
        ];
      }
      
      if (riskLevel) {
        query['analysis.overallRiskLevel'] = riskLevel;
      }
      
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
      }

      const skip = (page - 1) * limit;
      const history = await HistoryEntry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-logContent'); // Exclude large log content for list view

      const total = await HistoryEntry.countDocuments(query);

      ResponseUtils.paginated(res, history, page, limit, total, 'History retrieved successfully');

    } catch (error) {
      logger.error('Get user history error:', error);
      ResponseUtils.error(res, 'Failed to retrieve history');
    }
  }

  /**
   * Get specific analysis by ID
   */
  static async getAnalysisById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!ValidationUtils.isValidObjectId(id)) {
        ResponseUtils.error(res, 'Invalid analysis ID', 400);
        return;
      }

      const analysis = await HistoryEntry.findById(id);
      if (!analysis) {
        ResponseUtils.notFound(res, 'Analysis not found');
        return;
      }

      // Check access permissions
      const canAccess = req.user?.role === 'admin' || 
                       req.user?._id === analysis.userId || 
                       analysis.isPublic;

      if (!canAccess) {
        ResponseUtils.forbidden(res, 'Access denied');
        return;
      }

      ResponseUtils.success(res, analysis, 'Analysis retrieved successfully');

    } catch (error) {
      logger.error('Get analysis by ID error:', error);
      ResponseUtils.error(res, 'Failed to retrieve analysis');
    }
  }

  /**
   * Update analysis
   */
  static async updateAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, tags, isPublic } = req.body;

      if (!ValidationUtils.isValidObjectId(id)) {
        ResponseUtils.error(res, 'Invalid analysis ID', 400);
        return;
      }

      const analysis = await HistoryEntry.findById(id);
      if (!analysis) {
        ResponseUtils.notFound(res, 'Analysis not found');
        return;
      }

      // Check ownership (only owner or admin can update)
      const canUpdate = req.user?.role === 'admin' || req.user?._id === analysis.userId;
      if (!canUpdate) {
        ResponseUtils.forbidden(res, 'Access denied');
        return;
      }

      // Update fields
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (tags !== undefined) updateData.tags = tags;
      if (isPublic !== undefined) updateData.isPublic = isPublic;

      const updatedAnalysis = await HistoryEntry.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'UPDATE_ANALYSIS',
        resource: 'HistoryEntry',
        resourceId: id,
        details: { changes: updateData },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      ResponseUtils.success(res, updatedAnalysis, 'Analysis updated successfully');

    } catch (error) {
      logger.error('Update analysis error:', error);
      ResponseUtils.error(res, 'Failed to update analysis');
    }
  }

  /**
   * Delete analysis
   */
  static async deleteAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!ValidationUtils.isValidObjectId(id)) {
        ResponseUtils.error(res, 'Invalid analysis ID', 400);
        return;
      }

      const analysis = await HistoryEntry.findById(id);
      if (!analysis) {
        ResponseUtils.notFound(res, 'Analysis not found');
        return;
      }

      // Check ownership (only owner or admin can delete)
      const canDelete = req.user?.role === 'admin' || req.user?._id === analysis.userId;
      if (!canDelete) {
        ResponseUtils.forbidden(res, 'Access denied');
        return;
      }

      await HistoryEntry.findByIdAndDelete(id);

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'DELETE_ANALYSIS',
        resource: 'HistoryEntry',
        resourceId: id,
        details: { title: analysis.title },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      ResponseUtils.success(res, null, 'Analysis deleted successfully');

    } catch (error) {
      logger.error('Delete analysis error:', error);
      ResponseUtils.error(res, 'Failed to delete analysis');
    }
  }

  /**
   * Get public analyses
   */
  static async getPublicAnalyses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const riskLevel = req.query.riskLevel as string;
      const tags = req.query.tags as string;

      // Build query
      const query: any = { isPublic: true };
      
      if (riskLevel) {
        query['analysis.overallRiskLevel'] = riskLevel;
      }
      
      if (tags) {
        const tagArray = tags.split(',').map(tag => tag.trim());
        query.tags = { $in: tagArray };
      }

      const skip = (page - 1) * limit;
      const analyses = await HistoryEntry.find(query)
        .populate('userId', 'email firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-logContent'); // Exclude large log content

      const total = await HistoryEntry.countDocuments(query);

      ResponseUtils.paginated(res, analyses, page, limit, total, 'Public analyses retrieved successfully');

    } catch (error) {
      logger.error('Get public analyses error:', error);
      ResponseUtils.error(res, 'Failed to retrieve public analyses');
    }
  }

  /**
   * Search analyses
   */
  static async searchAnalyses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { value: searchParams, errors } = ValidationUtils.validate<SearchQuery>(
        ValidationUtils.searchSchema,
        req.query
      );

      if (errors.length > 0) {
        ResponseUtils.validationError(res, errors);
        return;
      }

      // Build query based on user role
      const query: any = {};
      
      if (req.user?.role !== 'admin') {
        // Non-admin users can only see their own analyses and public ones
        query.$or = [
          { userId: req.user?._id },
          { isPublic: true }
        ];
      }

      if (searchParams.q) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { title: { $regex: searchParams.q, $options: 'i' } },
            { 'analysis.summary': { $regex: searchParams.q, $options: 'i' } },
            { tags: { $regex: searchParams.q, $options: 'i' } }
          ]
        });
      }

      if (searchParams.tags && searchParams.tags.length > 0) {
        query.tags = { $in: searchParams.tags };
      }

      if (searchParams.severity && searchParams.severity.length > 0) {
        query['analysis.overallRiskLevel'] = { $in: searchParams.severity };
      }

      if (searchParams.dateFrom || searchParams.dateTo) {
        query.createdAt = {};
        if (searchParams.dateFrom) query.createdAt.$gte = searchParams.dateFrom;
        if (searchParams.dateTo) query.createdAt.$lte = searchParams.dateTo;
      }

      if (searchParams.userId && req.user?.role === 'admin') {
        query.userId = searchParams.userId;
      }

      if (searchParams.isPublic !== undefined) {
        query.isPublic = searchParams.isPublic;
      }

      const skip = (searchParams.page - 1) * searchParams.limit;
      const analyses = await HistoryEntry.find(query)
        .populate('userId', 'email firstName lastName')
        .sort({ [searchParams.sortBy]: searchParams.sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(searchParams.limit)
        .select('-logContent');

      const total = await HistoryEntry.countDocuments(query);

      ResponseUtils.paginated(
        res,
        analyses,
        searchParams.page,
        searchParams.limit,
        total,
        'Search completed successfully'
      );

    } catch (error) {
      logger.error('Search analyses error:', error);
      ResponseUtils.error(res, 'Failed to search analyses');
    }
  }

  /**
   * Get analysis statistics
   */
  static async getAnalysisStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.role === 'admin' ? req.query.userId as string : req.user?._id;
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

      // Build match query
      const matchQuery: any = {};
      if (userId) matchQuery.userId = userId;
      if (dateFrom || dateTo) {
        matchQuery.createdAt = {};
        if (dateFrom) matchQuery.createdAt.$gte = dateFrom;
        if (dateTo) matchQuery.createdAt.$lte = dateTo;
      }

      const stats = await HistoryEntry.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalAnalyses: { $sum: 1 },
            totalThreats: { $sum: '$analysis.totalThreats' },
            totalIssues: { $sum: '$analysis.totalIssues' },
            avgProcessingTime: { $avg: '$analysis.analysisMetadata.processingTime' },
            riskLevelDistribution: {
              $push: '$analysis.overallRiskLevel'
            }
          }
        },
        {
          $project: {
            _id: 0,
            totalAnalyses: 1,
            totalThreats: 1,
            totalIssues: 1,
            avgProcessingTime: { $round: ['$avgProcessingTime', 2] },
            riskLevelDistribution: 1
          }
        }
      ]);

      // Process risk level distribution
      const riskDistribution = stats[0]?.riskLevelDistribution || [];
      const riskCounts = riskDistribution.reduce((acc: any, level: string) => {
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});

      const result = {
        ...stats[0],
        riskLevelDistribution: riskCounts
      };

      ResponseUtils.success(res, result, 'Analysis statistics retrieved successfully');

    } catch (error) {
      logger.error('Get analysis stats error:', error);
      ResponseUtils.error(res, 'Failed to retrieve analysis statistics');
    }
  }

  /**
   * Export analysis data
   */
  static async exportAnalysis(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const format = req.query.format as string || 'json';

      if (!ValidationUtils.isValidObjectId(id)) {
        ResponseUtils.error(res, 'Invalid analysis ID', 400);
        return;
      }

      const analysis = await HistoryEntry.findById(id);
      if (!analysis) {
        ResponseUtils.notFound(res, 'Analysis not found');
        return;
      }

      // Check access permissions
      const canAccess = req.user?.role === 'admin' || 
                       req.user?._id === analysis.userId || 
                       analysis.isPublic;

      if (!canAccess) {
        ResponseUtils.forbidden(res, 'Access denied');
        return;
      }

      // Prepare export data
      const exportData = {
        id: analysis._id,
        title: analysis.title,
        createdAt: analysis.createdAt,
        analysis: analysis.analysis,
        tags: analysis.tags,
        logContent: analysis.logContent
      };

      // Set appropriate headers based on format
      switch (format.toLowerCase()) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="analysis-${id}.json"`);
          res.send(JSON.stringify(exportData, null, 2));
          break;
        case 'csv':
          // Convert to CSV format (simplified)
          const csvData = [
            'ID,Title,Created At,Risk Level,Total Threats,Total Issues,Summary',
            `${analysis._id},"${analysis.title}",${analysis.createdAt},"${analysis.analysis.overallRiskLevel}",${analysis.analysis.totalThreats},${analysis.analysis.totalIssues},"${analysis.analysis.summary}"`
          ].join('\n');
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analysis-${id}.csv"`);
          res.send(csvData);
          break;
        default:
          ResponseUtils.error(res, 'Unsupported export format', 400);
          return;
      }

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'EXPORT_ANALYSIS',
        resource: 'HistoryEntry',
        resourceId: id,
        details: { format },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

    } catch (error) {
      logger.error('Export analysis error:', error);
      ResponseUtils.error(res, 'Failed to export analysis');
    }
  }

  /**
   * Bulk delete analyses
   */
  static async bulkDeleteAnalyses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { analysisIds } = req.body;

      if (!Array.isArray(analysisIds) || analysisIds.length === 0) {
        ResponseUtils.error(res, 'Analysis IDs array is required', 400);
        return;
      }

      // Validate all analysis IDs
      const invalidIds = analysisIds.filter(id => !ValidationUtils.isValidObjectId(id));
      if (invalidIds.length > 0) {
        ResponseUtils.error(res, 'Invalid analysis IDs provided', 400);
        return;
      }

      // Build query based on user role
      const query: any = { _id: { $in: analysisIds } };
      if (req.user?.role !== 'admin') {
        query.userId = req.user?._id; // Non-admin can only delete their own
      }

      const result = await HistoryEntry.deleteMany(query);

      // Log audit trail
      await new AuditLog({
        userId: req.user?._id,
        action: 'BULK_DELETE_ANALYSES',
        resource: 'HistoryEntry',
        details: { analysisIds, deletedCount: result.deletedCount },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }).save();

      ResponseUtils.success(res, { deletedCount: result.deletedCount }, 'Bulk delete completed successfully');

    } catch (error) {
      logger.error('Bulk delete analyses error:', error);
      ResponseUtils.error(res, 'Bulk delete failed');
    }
  }
}
