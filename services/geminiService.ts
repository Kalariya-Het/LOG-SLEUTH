
import { GoogleGenAI, Type } from "@google/genai";
import { LogAnalysis } from '../types';

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


export const analyzeLogs = async (logs: string): Promise<LogAnalysis> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze the following system logs and provide a report. \n\nLogs:\n---\n${logs}`,
      config: {
        systemInstruction: "You are an expert cybersecurity analyst and IT operations specialist named 'LOG SLEUTH'. Your task is to analyze system logs to identify security threats, operational issues, and anomalies. Provide a clear, concise, and actionable report in JSON format. If no issues are found in a category, return an empty array for it.",
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
