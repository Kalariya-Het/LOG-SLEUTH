import mongoose, { Schema } from 'mongoose';
import { ISession } from '../types';

const sessionSchema = new Schema<ISession>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User'
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true
  },
  refreshToken: {
    type: String,
    required: [true, 'Refresh token is required'],
    unique: true
  },
  userAgent: {
    type: String,
    maxlength: [500, 'User agent cannot exceed 500 characters']
  },
  ipAddress: {
    type: String,
    maxlength: [45, 'IP address cannot exceed 45 characters'] // IPv6 max length
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: { expireAfterSeconds: 0 } // MongoDB TTL index
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
sessionSchema.index({ userId: 1 });
sessionSchema.index({ token: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ expiresAt: 1 });

// Static method to cleanup expired sessions
sessionSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isActive: false }
    ]
  });
};

// Static method to deactivate all user sessions
sessionSchema.statics.deactivateUserSessions = function(userId: string) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

export const Session = mongoose.model<ISession>('Session', sessionSchema);
