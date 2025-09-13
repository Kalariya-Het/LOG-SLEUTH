import mongoose, { Schema } from 'mongoose';
import { IHistoryEntry, SecurityThreat, OperationalIssue, LogAnalysis } from '../types';

const securityThreatSchema = new Schema<SecurityThreat>({
  severity: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  recommendation: {
    type: String,
    required: true,
    maxlength: [1000, 'Recommendation cannot exceed 1000 characters']
  },
  timestamp: {
    type: String,
    required: true
  },
  category: {
    type: String,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100
  }
}, { _id: false });

const operationalIssueSchema = new Schema<OperationalIssue>({
  type: {
    type: String,
    enum: ['Error', 'Warning', 'Performance', 'Info'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  recommendation: {
    type: String,
    required: true,
    maxlength: [1000, 'Recommendation cannot exceed 1000 characters']
  },
  timestamp: {
    type: String,
    required: true
  },
  category: {
    type: String,
    maxlength: [100, 'Category cannot exceed 100 characters']
  },
  impact: {
    type: String,
    maxlength: [200, 'Impact cannot exceed 200 characters']
  }
}, { _id: false });

const logAnalysisSchema = new Schema<LogAnalysis>({
  summary: {
    type: String,
    required: true,
    maxlength: [2000, 'Summary cannot exceed 2000 characters']
  },
  securityThreats: [securityThreatSchema],
  operationalIssues: [operationalIssueSchema],
  totalThreats: {
    type: Number,
    default: 0,
    min: 0
  },
  totalIssues: {
    type: Number,
    default: 0,
    min: 0
  },
  overallRiskLevel: {
    type: String,
    enum: ['Critical', 'High', 'Medium', 'Low'],
    required: true
  },
  analysisMetadata: {
    processingTime: {
      type: Number,
      min: 0
    },
    logSize: {
      type: Number,
      min: 0
    },
    linesAnalyzed: {
      type: Number,
      min: 0
    }
  }
}, { _id: false });

const historyEntrySchema = new Schema<IHistoryEntry>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  logContent: {
    type: String,
    required: [true, 'Log content is required']
  },
  analysis: {
    type: logAnalysisSchema,
    required: [true, 'Analysis is required']
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  fileMetadata: {
    originalName: {
      type: String,
      maxlength: [255, 'Original name cannot exceed 255 characters']
    },
    size: {
      type: Number,
      min: 0
    },
    mimeType: {
      type: String,
      maxlength: [100, 'MIME type cannot exceed 100 characters']
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
historyEntrySchema.index({ userId: 1, createdAt: -1 });
historyEntrySchema.index({ tags: 1 });
historyEntrySchema.index({ isPublic: 1 });
historyEntrySchema.index({ 'analysis.overallRiskLevel': 1 });
historyEntrySchema.index({ 'analysis.totalThreats': -1 });
historyEntrySchema.index({ 'analysis.totalIssues': -1 });

// Text search index
historyEntrySchema.index({
  title: 'text',
  logContent: 'text',
  'analysis.summary': 'text',
  tags: 'text'
});

// Static method to get user statistics
historyEntrySchema.statics.getUserStats = function(userId: string) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        totalThreats: { $sum: '$analysis.totalThreats' },
        totalIssues: { $sum: '$analysis.totalIssues' },
        criticalThreats: {
          $sum: {
            $size: {
              $filter: {
                input: '$analysis.securityThreats',
                cond: { $eq: ['$$this.severity', 'Critical'] }
              }
            }
          }
        },
        highThreats: {
          $sum: {
            $size: {
              $filter: {
                input: '$analysis.securityThreats',
                cond: { $eq: ['$$this.severity', 'High'] }
              }
            }
          }
        }
      }
    }
  ]);
};

// Static method to get public analyses
historyEntrySchema.statics.getPublicAnalyses = function(limit = 10, skip = 0) {
  return this.find({ isPublic: true })
    .populate('userId', 'email firstName lastName')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

export const HistoryEntry = mongoose.model<IHistoryEntry>('HistoryEntry', historyEntrySchema);
