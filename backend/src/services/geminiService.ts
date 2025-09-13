import { GoogleGenerativeAI } from '@google/genai';
import { LogAnalysis, SecurityThreat, OperationalIssue } from '../types';
import { logger } from '../config/logger';

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  /**
   * Analyze log content using Gemini AI
   */
  async analyzeLog(logContent: string): Promise<LogAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(logContent);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the AI response
      const analysis = this.parseAnalysisResponse(text);
      
      // Validate and enhance the analysis
      return this.validateAndEnhanceAnalysis(analysis, logContent);

    } catch (error) {
      logger.error('Gemini analysis error:', error);
      
      // Fallback analysis if AI fails
      return this.createFallbackAnalysis(logContent);
    }
  }

  /**
   * Build the analysis prompt for Gemini
   */
  private buildAnalysisPrompt(logContent: string): string {
    return `
You are a cybersecurity expert analyzing log files. Please analyze the following log content and provide a comprehensive security and operational assessment.

LOG CONTENT:
${logContent}

Please provide your analysis in the following JSON format:
{
  "summary": "Brief overview of the log analysis findings",
  "securityThreats": [
    {
      "severity": "Critical|High|Medium|Low|Informational",
      "description": "Description of the security threat",
      "recommendation": "Recommended action to address the threat",
      "timestamp": "Relevant timestamp from logs",
      "category": "Type of security threat",
      "riskScore": 0-100
    }
  ],
  "operationalIssues": [
    {
      "type": "Error|Warning|Performance|Info",
      "description": "Description of the operational issue",
      "recommendation": "Recommended action to address the issue",
      "timestamp": "Relevant timestamp from logs",
      "category": "Type of operational issue",
      "impact": "Impact description"
    }
  ],
  "totalThreats": 0,
  "totalIssues": 0,
  "overallRiskLevel": "Critical|High|Medium|Low"
}

Focus on:
1. Security threats (failed logins, suspicious activities, potential attacks)
2. Operational issues (errors, warnings, performance problems)
3. Patterns and anomalies
4. Actionable recommendations
5. Risk assessment

Provide specific, actionable insights based on the actual log content.
`;
  }

  /**
   * Parse the AI response into structured analysis
   */
  private parseAnalysisResponse(responseText: string): LogAnalysis {
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        summary: parsed.summary || 'Analysis completed',
        securityThreats: parsed.securityThreats || [],
        operationalIssues: parsed.operationalIssues || [],
        totalThreats: parsed.totalThreats || parsed.securityThreats?.length || 0,
        totalIssues: parsed.totalIssues || parsed.operationalIssues?.length || 0,
        overallRiskLevel: parsed.overallRiskLevel || 'Low'
      };

    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      throw error;
    }
  }

  /**
   * Validate and enhance the analysis
   */
  private validateAndEnhanceAnalysis(analysis: LogAnalysis, logContent: string): LogAnalysis {
    // Ensure required fields exist
    analysis.securityThreats = analysis.securityThreats || [];
    analysis.operationalIssues = analysis.operationalIssues || [];
    
    // Validate and fix threat data
    analysis.securityThreats = analysis.securityThreats.map(threat => ({
      severity: this.validateSeverity(threat.severity),
      description: threat.description || 'Security threat detected',
      recommendation: threat.recommendation || 'Further investigation required',
      timestamp: threat.timestamp || new Date().toISOString(),
      category: threat.category || 'General',
      riskScore: this.validateRiskScore(threat.riskScore)
    }));

    // Validate and fix issue data
    analysis.operationalIssues = analysis.operationalIssues.map(issue => ({
      type: this.validateIssueType(issue.type),
      description: issue.description || 'Operational issue detected',
      recommendation: issue.recommendation || 'Review and address issue',
      timestamp: issue.timestamp || new Date().toISOString(),
      category: issue.category || 'General',
      impact: issue.impact || 'Unknown impact'
    }));

    // Update counts
    analysis.totalThreats = analysis.securityThreats.length;
    analysis.totalIssues = analysis.operationalIssues.length;

    // Determine overall risk level
    analysis.overallRiskLevel = this.calculateOverallRiskLevel(analysis);

    return analysis;
  }

  /**
   * Create fallback analysis when AI fails
   */
  private createFallbackAnalysis(logContent: string): LogAnalysis {
    const lines = logContent.split('\n');
    const errorLines = lines.filter(line => 
      line.toLowerCase().includes('error') || 
      line.toLowerCase().includes('fail') ||
      line.toLowerCase().includes('exception')
    );

    const warningLines = lines.filter(line => 
      line.toLowerCase().includes('warning') || 
      line.toLowerCase().includes('warn')
    );

    const securityKeywords = ['login', 'auth', 'unauthorized', 'forbidden', 'attack', 'breach'];
    const securityLines = lines.filter(line => 
      securityKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );

    const securityThreats: SecurityThreat[] = securityLines.slice(0, 5).map((line, index) => ({
      severity: 'Medium' as const,
      description: `Potential security event detected: ${line.substring(0, 100)}...`,
      recommendation: 'Review this log entry for potential security implications',
      timestamp: new Date().toISOString(),
      category: 'Security Event',
      riskScore: 50
    }));

    const operationalIssues: OperationalIssue[] = [
      ...errorLines.slice(0, 3).map(line => ({
        type: 'Error' as const,
        description: `Error detected: ${line.substring(0, 100)}...`,
        recommendation: 'Investigate and resolve this error',
        timestamp: new Date().toISOString(),
        category: 'System Error',
        impact: 'May affect system functionality'
      })),
      ...warningLines.slice(0, 2).map(line => ({
        type: 'Warning' as const,
        description: `Warning detected: ${line.substring(0, 100)}...`,
        recommendation: 'Monitor this warning for potential issues',
        timestamp: new Date().toISOString(),
        category: 'System Warning',
        impact: 'Potential performance impact'
      }))
    ];

    return {
      summary: `Fallback analysis completed. Found ${errorLines.length} errors, ${warningLines.length} warnings, and ${securityLines.length} potential security events in ${lines.length} log lines.`,
      securityThreats,
      operationalIssues,
      totalThreats: securityThreats.length,
      totalIssues: operationalIssues.length,
      overallRiskLevel: this.calculateOverallRiskLevel({
        securityThreats,
        operationalIssues,
        totalThreats: securityThreats.length,
        totalIssues: operationalIssues.length
      } as LogAnalysis)
    };
  }

  /**
   * Validate severity level
   */
  private validateSeverity(severity: any): SecurityThreat['severity'] {
    const validSeverities: SecurityThreat['severity'][] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
    return validSeverities.includes(severity) ? severity : 'Medium';
  }

  /**
   * Validate issue type
   */
  private validateIssueType(type: any): OperationalIssue['type'] {
    const validTypes: OperationalIssue['type'][] = ['Error', 'Warning', 'Performance', 'Info'];
    return validTypes.includes(type) ? type : 'Info';
  }

  /**
   * Validate risk score
   */
  private validateRiskScore(score: any): number {
    const numScore = typeof score === 'number' ? score : parseInt(score) || 0;
    return Math.max(0, Math.min(100, numScore));
  }

  /**
   * Calculate overall risk level based on threats and issues
   */
  private calculateOverallRiskLevel(analysis: Partial<LogAnalysis>): LogAnalysis['overallRiskLevel'] {
    const threats = analysis.securityThreats || [];
    const issues = analysis.operationalIssues || [];

    // Check for critical threats
    if (threats.some(t => t.severity === 'Critical')) {
      return 'Critical';
    }

    // Check for high threats or multiple medium threats
    const highThreats = threats.filter(t => t.severity === 'High').length;
    const mediumThreats = threats.filter(t => t.severity === 'Medium').length;
    const errors = issues.filter(i => i.type === 'Error').length;

    if (highThreats > 0 || errors > 5 || mediumThreats > 3) {
      return 'High';
    }

    if (mediumThreats > 0 || errors > 0 || issues.length > 3) {
      return 'Medium';
    }

    return 'Low';
  }
}

export const geminiService = new GeminiService();
