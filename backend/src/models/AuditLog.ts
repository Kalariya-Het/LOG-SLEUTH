import mongoose, { Schema } from 'mongoose';
import { IAuditLog } from '../types';

const auditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: String,
    ref: 'User',
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    maxlength: [100, 'Action cannot exceed 100 characters']
  },
  resource: {
    type: String,
    required: [true, 'Resource is required'],
    maxlength: [100, 'Resource cannot exceed 100 characters']
  },
  resourceId: {
    type: String,
    maxlength: [100, 'Resource ID cannot exceed 100 characters']
  },
  details: {
    type: Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    maxlength: [45, 'IP address cannot exceed 45 characters']
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ timestamp: -1 });

// TTL index to automatically delete old audit logs after 1 year
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
