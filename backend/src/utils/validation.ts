import Joi from 'joi';
import { ValidationError } from '../types';

export class ValidationUtils {
  /**
   * User registration validation schema
   */
  static readonly registerSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
      })
  });

  /**
   * User login validation schema
   */
  static readonly loginSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      }),
    rememberMe: Joi.boolean().optional()
  });

  /**
   * Change password validation schema
   */
  static readonly changePasswordSchema = Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'New password must be at least 8 characters long',
        'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'New password is required'
      })
  });

  /**
   * Forgot password validation schema
   */
  static readonly forgotPasswordSchema = Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  });

  /**
   * Reset password validation schema
   */
  static readonly resetPasswordSchema = Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    newPassword: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      })
  });

  /**
   * Log analysis validation schema
   */
  static readonly logAnalysisSchema = Joi.object({
    logContent: Joi.string()
      .min(10)
      .max(1000000) // 1MB limit
      .required()
      .messages({
        'string.min': 'Log content must be at least 10 characters long',
        'string.max': 'Log content cannot exceed 1MB',
        'any.required': 'Log content is required'
      }),
    title: Joi.string()
      .min(3)
      .max(200)
      .optional()
      .messages({
        'string.min': 'Title must be at least 3 characters long',
        'string.max': 'Title cannot exceed 200 characters'
      }),
    tags: Joi.array()
      .items(Joi.string().min(2).max(50))
      .max(10)
      .optional()
      .messages({
        'array.max': 'Cannot have more than 10 tags',
        'string.min': 'Each tag must be at least 2 characters long',
        'string.max': 'Each tag cannot exceed 50 characters'
      }),
    isPublic: Joi.boolean().optional()
  });

  /**
   * User update validation schema (for admin)
   */
  static readonly userUpdateSchema = Joi.object({
    email: Joi.string()
      .email()
      .optional()
      .messages({
        'string.email': 'Please provide a valid email address'
      }),
    role: Joi.string()
      .valid('user', 'admin')
      .optional()
      .messages({
        'any.only': 'Role must be either "user" or "admin"'
      }),
    isActive: Joi.boolean().optional(),
    firstName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 50 characters'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .optional()
      .messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 50 characters'
      })
  });

  /**
   * Search query validation schema
   */
  static readonly searchSchema = Joi.object({
    q: Joi.string().min(2).max(200).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    severity: Joi.array().items(Joi.string().valid('Critical', 'High', 'Medium', 'Low', 'Informational')).optional(),
    dateFrom: Joi.date().optional(),
    dateTo: Joi.date().optional(),
    userId: Joi.string().optional(),
    isPublic: Joi.boolean().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'overallRiskLevel').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });

  /**
   * Validate data against schema
   */
  static validate<T>(schema: Joi.ObjectSchema, data: any): { value: T; errors: ValidationError[] } {
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    const errors: ValidationError[] = [];
    
    if (error) {
      errors.push(...error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      })));
    }

    return { value, errors };
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(content: string): string {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate MongoDB ObjectId
   */
  static isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check password strength
   */
  static checkPasswordStrength(password: string): {
    score: number;
    feedback: string[];
    isStrong: boolean;
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Password should be at least 8 characters long');

    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Password should contain lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Password should contain uppercase letters');

    if (/\d/.test(password)) score += 1;
    else feedback.push('Password should contain numbers');

    if (/[@$!%*?&]/.test(password)) score += 1;
    else feedback.push('Password should contain special characters');

    // Common patterns check
    if (!/(.)\1{2,}/.test(password)) score += 1;
    else feedback.push('Password should not contain repeated characters');

    return {
      score,
      feedback,
      isStrong: score >= 5
    };
  }
}
