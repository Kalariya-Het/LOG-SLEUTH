
import { GoogleGenAI, Type } from "@google/genai";
import { LogAnalysis } from '../types';
import { ANALYSIS_CONFIG } from '../config/analysis';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const logAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A brief, one-paragraph summary of the key findings in the logs."
    },
    securityThreats: {
      type: Type.ARRAY,
      description: "A list of identified security threats.",
      items: {
        type: Type.OBJECT,
        required: ["severity", "description", "recommendation", "timestamp"],
        properties: {
          severity: {
            type: Type.STRING,
            description: "Severity of the threat. Must be one of: Critical, High, Medium, Low, Informational."
          },
          description: {
            type: Type.STRING,
            description: "A detailed description of the threat."
          },
          recommendation: {
            type: Type.STRING,
            description: "An actionable recommendation to mitigate the threat."
          },
          timestamp: {
            type: Type.STRING,
            description: "The approximate timestamp from the log where the event occurred. If not available, use 'N/A'."
          }
        }
      }
    },
    operationalIssues: {
      type: Type.ARRAY,
      description: "A list of identified operational or performance issues.",
      items: {
        type: Type.OBJECT,
        required: ["type", "description", "recommendation", "timestamp"],
        properties: {
          type: {
            type: Type.STRING,
            description: "The type of issue. Must be one of: Error, Warning, Performance, Info."
          },
          description: {
            type: Type.STRING,
            description: "A detailed description of the issue."
          },
          recommendation: {
            type: Type.STRING,
            description: "An actionable recommendation to resolve the issue."
          },
          timestamp: {
            type: Type.STRING,
            description: "The approximate timestamp from the log where the event occurred. If not available, use 'N/A'."
          }
        }
      }
    }
  },
  required: ["summary", "securityThreats", "operationalIssues"]
};


// Configuration constants
const MAX_LOG_SIZE = 50000; // Maximum characters for log analysis
const API_TIMEOUT = 30000; // 30 seconds timeout
const MAX_RETRIES = 2;

// Preprocess logs to optimize for analysis
const preprocessLogs = (logs: string): string => {
  // Remove excessive whitespace and empty lines
  const cleaned = logs
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
  
  // Truncate if too long, keeping the most recent entries
  if (cleaned.length > MAX_LOG_SIZE) {
    const lines = cleaned.split('\n');
    const truncatedLines = lines.slice(-Math.floor(MAX_LOG_SIZE / 100)); // Rough estimate
    return truncatedLines.join('\n').slice(-MAX_LOG_SIZE);
  }
  
  return cleaned;
};

// Create a timeout wrapper for the API call
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export const analyzeLogs = async (logs: string): Promise<LogAnalysis> => {
  // Validate input
  if (!logs || logs.trim().length === 0) {
    throw new Error("Log content cannot be empty");
  }

  // Preprocess logs
  const processedLogs = preprocessLogs(logs);
  
  if (processedLogs.length === 0) {
    throw new Error("No valid log content found after preprocessing");
  }

  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Analysis attempt ${attempt}/${MAX_RETRIES} - Processing ${processedLogs.length} characters`);
      
      const analysisPromise = ai.models.generateContent({
        model: "gemini-1.5-flash", // Use faster model
        contents: `Analyze the following system logs and provide a security and operational report.

LOGS (${processedLogs.length} chars):
---
${processedLogs}
---

Focus on the most critical issues only. Be concise.`,
        config: {
          systemInstruction: "You are LOG SLEUTH, a cybersecurity analyst. Analyze logs quickly and concisely. Provide JSON with security threats and operational issues. Focus on critical findings only.",
          responseMimeType: "application/json",
          responseSchema: logAnalysisSchema,
          generationConfig: {
            temperature: 0.1, // Lower temperature for more consistent results
            maxOutputTokens: 2048, // Limit response size
          }
        },
      });

      const response = await withTimeout(analysisPromise, API_TIMEOUT);
      const jsonText = response.text.trim();
      const parsedResult = JSON.parse(jsonText) as LogAnalysis;
      
      console.log(`Analysis completed successfully on attempt ${attempt}`);
      return parsedResult;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error occurred");
      console.warn(`Analysis attempt ${attempt} failed:`, lastError.message);
      
      if (attempt === MAX_RETRIES) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // If all retries failed, provide a simplified analysis
  console.error("All analysis attempts failed, providing fallback analysis");
  return createFallbackAnalysis(processedLogs, lastError);
};

// Fallback analysis when AI fails
const createFallbackAnalysis = (logs: string, originalError: Error | null): LogAnalysis => {
  const lines = logs.split('\n');
  const errorKeywords = ['error', 'fail', 'exception', 'crash', 'abort'];
  const warningKeywords = ['warn', 'warning', 'caution'];
  const securityKeywords = ['login', 'auth', 'unauthorized', 'forbidden', 'attack', 'breach', 'hack', 'intrusion'];
  
  const errorLines = lines.filter(line => 
    errorKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  const warningLines = lines.filter(line => 
    warningKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );
  
  const securityLines = lines.filter(line => 
    securityKeywords.some(keyword => line.toLowerCase().includes(keyword))
  );

  const securityThreats = securityLines.slice(0, 3).map(line => ({
    severity: 'Medium' as const,
    description: `Potential security event: ${line.slice(0, 100)}...`,
    recommendation: 'Review this log entry for security implications',
    timestamp: 'N/A'
  }));

  const operationalIssues = [
    ...errorLines.slice(0, 3).map(line => ({
      type: 'Error' as const,
      description: `Error detected: ${line.slice(0, 100)}...`,
      recommendation: 'Investigate and resolve this error',
      timestamp: 'N/A'
    })),
    ...warningLines.slice(0, 2).map(line => ({
      type: 'Warning' as const,
      description: `Warning found: ${line.slice(0, 100)}...`,
      recommendation: 'Monitor this warning',
      timestamp: 'N/A'
    }))
  ];

  return {
    summary: `Fallback analysis completed due to AI service issues${originalError ? `: ${originalError.message}` : ''}. Found ${errorLines.length} errors, ${warningLines.length} warnings, and ${securityLines.length} potential security events in ${lines.length} log lines.`,
    securityThreats,
    operationalIssues
  };
};
