
import React from 'react';
import { LogAnalysis, SecurityThreat, OperationalIssue } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';

interface AnalysisResultProps {
  isLoading: boolean;
  error: string | null;
  analysis: LogAnalysis | null;
}

const getSeverityClass = (severity: SecurityThreat['severity']) => {
  switch (severity) {
    case 'Critical':
      return 'bg-red-500 text-white';
    case 'High':
      return 'bg-orange-500 text-white';
    case 'Medium':
      return 'bg-yellow-400 text-black';
    case 'Low':
      return 'bg-blue-500 text-white';
    case 'Informational':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-gray-400 text-black';
  }
};

const getIssueTypeClass = (type: OperationalIssue['type']) => {
    switch (type) {
      case 'Error':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'Warning':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'Performance':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isLoading, error, analysis }) => {
  if (isLoading) {
    return (
      <div className="mt-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary"></div>
        <p className="mt-4 text-lg text-brand-text-secondary">AI is analyzing your logs. Please wait...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-8 max-w-4xl mx-auto p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-md">
        <h3 className="font-bold">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }
  
  const { summary, securityThreats, operationalIssues } = analysis;
  const hasContent = summary || securityThreats.length > 0 || operationalIssues.length > 0;

  const handleExport = () => {
    if (!analysis) return;

    const jsonString = JSON.stringify(analysis, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'log-sleuth-analysis.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  if (!hasContent) {
     return (
        <div className="mt-8 max-w-4xl mx-auto p-6 bg-brand-surface border border-brand-border rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-2">Analysis Complete</h2>
            <p className="text-brand-text-secondary">The AI analysis did not find any specific threats or operational issues in the provided logs.</p>
        </div>
    );
  }

  return (
    <div className="mt-8 max-w-6xl mx-auto space-y-8">
      {/* Summary Section */}
      <div className="p-6 bg-brand-surface border border-brand-border rounded-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-brand-primary">Analysis Summary</h2>
            <button
                onClick={handleExport}
                className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text-primary rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                aria-label="Export analysis results as JSON"
            >
                <DownloadIcon />
                Export JSON
            </button>
        </div>
        <p className="text-brand-text-secondary whitespace-pre-wrap">{summary}</p>
      </div>

      {/* Security Threats Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Security Threats ({securityThreats.length})</h2>
        {securityThreats.length > 0 ? (
          <div className="overflow-x-auto bg-brand-surface border border-brand-border rounded-lg">
            <table className="min-w-full divide-y divide-brand-border">
              <thead className="bg-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Severity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Recommendation</th>
                   <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-brand-text-secondary uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {securityThreats.map((threat, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSeverityClass(threat.severity)}`}>
                        {threat.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-brand-text-primary">{threat.description}</td>
                    <td className="px-6 py-4 text-sm text-brand-text-secondary">{threat.recommendation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-text-secondary font-mono">{threat.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-brand-text-secondary p-4 bg-brand-surface rounded-lg border border-brand-border">No security threats found.</p>
        )}
      </div>

      {/* Operational Issues Section */}
       <div>
        <h2 className="text-2xl font-bold mb-4">Operational Issues ({operationalIssues.length})</h2>
        {operationalIssues.length > 0 ? (
          <div className="space-y-4">
            {operationalIssues.map((issue, index) => (
              <div key={index} className={`p-4 border rounded-lg ${getIssueTypeClass(issue.type)}`}>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-lg">{issue.type}</h4>
                  <span className="text-sm font-mono opacity-70">{issue.timestamp}</span>
                </div>
                <p className="mt-2 text-sm">{issue.description}</p>
                <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                    <p className="text-sm"><span className="font-semibold">Recommendation: </span>{issue.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-brand-text-secondary p-4 bg-brand-surface rounded-lg border border-brand-border">No operational issues found.</p>
        )}
      </div>
    </div>
  );
};
