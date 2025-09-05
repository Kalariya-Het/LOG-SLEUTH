
import { GoogleGenAI, Type } from "@google/genai";
import { LogAnalysis, AnalysisDepth, AnalysisFocus } from '../types';

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
        required: ["severity", "description", "recommendation", "timestamp", "logLine"],
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
          },
          logLine: {
            type: Type.STRING,
            description: "The specific log line or snippet that this finding is based on. If not directly attributable, use 'N/A'."
          }
        }
      }
    },
    operationalIssues: {
      type: Type.ARRAY,
      description: "A list of identified operational or performance issues.",
      items: {
        type: Type.OBJECT,
        required: ["type", "description", "recommendation", "timestamp", "logLine"],
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
          },
           logLine: {
            type: Type.STRING,
            description: "The specific log line or snippet that this finding is based on. If not directly attributable, use 'N/A'."
          }
        }
      }
    },
    structuredDataSummary: {
        type: Type.STRING,
        description: "If structured logs (like JSON) are found, a brief summary of the key insights from the structured data. Otherwise, omit this field."
    },
    structuredDataItems: {
        type: Type.ARRAY,
        description: "A list of specific, important key-value pairs extracted from structured logs. Otherwise, omit this field.",
        items: {
            type: Type.OBJECT,
            required: ["key", "value", "context", "timestamp"],
            properties: {
                key: { type: Type.STRING, description: "The key of the extracted data point (e.g., 'transactionId', 'responseTimeMs')." },
                value: { type: Type.STRING, description: "The value of the extracted data point." },
                context: { type: Type.STRING, description: "The original log line or a snippet providing context for the data point." },
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


export const analyzeLogs = async (
    logs: string, 
    depth: AnalysisDepth, 
    focus: AnalysisFocus
): Promise<LogAnalysis> => {
  try {
    let systemInstruction = "You are an expert cybersecurity analyst and IT operations specialist named 'LOG SLEUTH'. Your task is to analyze system logs to identify security threats, operational issues, and anomalies. For each threat and issue identified, you MUST include the `logLine` field, containing the exact, unmodified log line from the input that corresponds to that finding; this provides critical context. Provide a clear, concise, and actionable report in JSON format. If no issues are found in a category, return an empty array for it. If the logs are structured (e.g., JSON), you MUST parse them to extract key fields. Identify patterns in structured data, such as high response times, frequent errors for a specific user ID, or failed transaction IDs. Summarize these findings in the 'structuredDataSummary' and list specific extracted data points in 'structuredDataItems'.";

    // Append depth instruction
    switch (depth) {
        case 'Shallow':
            systemInstruction += " Your analysis should be high-level and brief. Focus only on the most critical findings. Keep descriptions and recommendations very short.";
            break;
        case 'Verbose':
            systemInstruction += " Your analysis must be extremely detailed and comprehensive. For each finding, explain your reasoning, reference specific log lines where possible, and provide in-depth mitigation strategies. Be exhaustive in your explanations.";
            break;
        case 'Detailed':
        default:
            // Base instruction is already good for 'Detailed'.
            break;
    }

    // Append focus instruction
    switch (focus) {
        case 'Security':
            systemInstruction += " Your analysis must focus exclusively on security threats. Pay minimal attention to operational issues, only mentioning them if they have direct and significant security implications. The 'operationalIssues' array in your JSON response should usually be empty.";
            break;
        case 'Operational':
            systemInstruction += " Your analysis must focus exclusively on operational and performance issues (like errors, warnings, and system health). Pay minimal attention to security threats, only mentioning them if they are critical and directly impact operations. The 'securityThreats' array in your JSON response should usually be empty.";
            break;
        case 'All':
        default:
             // Base instruction covers both.
            break;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following system logs and provide a report. \n\nLogs:\n---\n${logs}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: logAnalysisSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedResult = JSON.parse(jsonText) as LogAnalysis;
    return parsedResult;
  } catch (error) {
    console.error("Error analyzing logs with Gemini API:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while communicating with the AI model.");
  }
};