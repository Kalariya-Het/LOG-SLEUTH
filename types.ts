
import React from 'react';

export interface SecurityThreat {
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  description: string;
  recommendation: string;
  timestamp: string;
}

export interface OperationalIssue {
  type: 'Error' | 'Warning' | 'Performance' | 'Info';
  description: string;
  recommendation: string;
  timestamp: string;
}

export interface LogAnalysis {
  summary: string;
  securityThreats: SecurityThreat[];
  operationalIssues: OperationalIssue[];
}

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}
