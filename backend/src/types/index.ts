import { Request } from 'express';
import { Document } from 'mongoose';

// User Types
export interface IUser extends Document {
  _id: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  lastLogin?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

// Session Types
export interface ISession extends Document {
  userId: string;
  token: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Log Analysis Types
export interface SecurityThreat {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  recommendation: string;
  timestamp: string;
  category?: string;
  riskScore?: number;
}

export interface OperationalIssue {
  type: 'Error' | 'Warning' | 'Performance' | 'Info';
  description: string;
  recommendation: string;
  timestamp: string;
  category?: string;
  impact?: string;
}

export interface LogAnalysis {
  summary: string;
  securityThreats: SecurityThreat[];
  operationalIssues: OperationalIssue[];
  totalThreats: number;
  totalIssues: number;
  overallRiskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  analysisMetadata?: {
    processingTime: number;
    logSize: number;
    linesAnalyzed: number;
  };
}

// History Types
export interface IHistoryEntry extends Document {
  _id: string;
  userId: string;
  title?: string;
  logContent: string;
  analysis: LogAnalysis;
  tags?: string[];
  isPublic: boolean;
  fileMetadata?: {
    originalName: string;
    size: number;
    mimeType: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Request Types
export interface AuthenticatedRequest extends Request {
  user?: IUser;
  session?: ISession;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Admin Types
export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalAnalyses: number;
  analysesToday: number;
  securityThreatsFound: number;
  operationalIssuesFound: number;
  systemHealth: 'Good' | 'Warning' | 'Critical';
}

export interface UserManagementRequest {
  email?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
  firstName?: string;
  lastName?: string;
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// File Upload Types
export interface FileUploadRequest {
  file: Express.Multer.File;
  title?: string;
  tags?: string[];
  isPublic?: boolean;
}

// Search and Filter Types
export interface SearchQuery {
  q?: string;
  tags?: string[];
  severity?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
  isPublic?: boolean;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Audit Log Types
export interface IAuditLog extends Document {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

// System Configuration Types
export interface SystemConfig {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxFileSize: number;
  maxAnalysesPerUser: number;
  sessionTimeout: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
}
