// Configuration constants for LOG-SLEUTH performance optimization
export const ANALYSIS_CONFIG = {
  // Input limits
  MAX_LOG_SIZE: 50000, // Maximum characters for log analysis
  MIN_LOG_SIZE: 50, // Minimum characters for meaningful analysis
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB maximum file upload
  
  // API settings
  API_TIMEOUT: 30000, // 30 seconds timeout
  MAX_RETRIES: 2, // Maximum retry attempts
  RETRY_DELAY_BASE: 1000, // Base delay for exponential backoff (ms)
  
  // Gemini model configuration
  MODEL_NAME: "gemini-1.5-flash", // Faster model for better performance
  TEMPERATURE: 0.1, // Lower temperature for consistency
  MAX_OUTPUT_TOKENS: 2048, // Limit response size
  
  // UI thresholds for character count colors
  WARNING_THRESHOLD: 0.7, // 70% of max
  DANGER_THRESHOLD: 0.9, // 90% of max
} as const;

export type AnalysisConfig = typeof ANALYSIS_CONFIG;