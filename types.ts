import React from 'react';

export interface SecurityThreat {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  recommendation: string;
  timestamp: string;
  logLine?: string;
}

export interface OperationalIssue {
  type: 'Error' | 'Warning' | 'Performance' | 'Info';
  description: string;
  recommendation: string;
  timestamp: string;
  logLine?: string;
}

export interface StructuredDataItem {
  key: string;
  value: string;
  context: string;
  timestamp: string;
}

export interface LogAnalysis {
  summary: string;
  securityThreats: SecurityThreat[];
  operationalIssues: OperationalIssue[];
  structuredDataSummary?: string;
  structuredDataItems?: StructuredDataItem[];
}

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface HistoryEntry {
  id: string;
  userId: string;
  createdAt: string;
  logContent: string;
  analysis: LogAnalysis;
}

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export type AnalysisDepth = 'Shallow' | 'Detailed' | 'Verbose';
export type AnalysisFocus = 'All' | 'Security' | 'Operational';

export interface AlertRule {
  id: string;
  userId: string;
  name: string;
  triggerOn: 'Security' | 'Operational';
  severities: Array<SecurityThreat['severity']>;
  issueTypes: Array<OperationalIssue['type']>;
  keyword: string; 
}

export interface TriggeredAlert {
  id: string;
  userId: string;
  ruleName: string;
  historyEntryId: string;
  findingDescription: string;
  findingIdentifier: SecurityThreat['severity'] | OperationalIssue['type'];
  timestamp: string;
  isRead: boolean;
}

export type ExportFormat = 'JSON' | 'PlainText';

export interface ExportOptions {
  url: string;
  format: ExportFormat;
  authToken?: string;
}