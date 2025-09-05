import React, { useState, useMemo } from 'react';
import { LogAnalysis, SecurityThreat, OperationalIssue } from '../types';
import { DownloadIcon } from './icons/DownloadIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BoltIcon } from './icons/BoltIcon';
import { IncidentReplayModal } from './IncidentReplayModal';
import { PlayCircleIcon } from './icons/PlayCircleIcon';
import { CodeBracketIcon } from './icons/CodeBracketIcon';
import { ShareIcon } from './icons/ShareIcon';
import { ExportModal } from './ExportModal';

interface AnalysisResultProps {
  isLoading: boolean;
  error: string | null;
  analysis: LogAnalysis | null;
  logContent: string;
}

const getSeverityConfig = (severity: SecurityThreat['severity']) => {
  switch (severity) {
    case 'Critical':
      return {
        className: 'bg-red-500 text-white',
        icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-300" />,
        borderColor: 'border-red-500/30'
      };
    case 'High':
      return {
        className: 'bg-orange-500 text-white',
        icon: <ExclamationCircleIcon className="h-5 w-5 text-orange-300" />,
        borderColor: 'border-orange-500/30'
      };
    case 'Medium':
      return {
        className: 'bg-yellow-400 text-black',
        icon: <ShieldExclamationIcon className="h-5 w-5 text-yellow-300" />,
        borderColor: 'border-yellow-500/30'
      };
    case 'Low':
      return {
        className: 'bg-blue-500 text-white',
        icon: <InformationCircleIcon className="h-5 w-5 text-blue-300" />,
        borderColor: 'border-blue-500/30'
      };
    default:
      return {
        className: 'bg-gray-500 text-white',
        icon: <InformationCircleIcon className="h-5 w-5 text-gray-300" />,
        borderColor: 'border-gray-500/30'
      };
  }
};

const getIssueTypeConfig = (type: OperationalIssue['type']) => {
    switch (type) {
      case 'Error':
        return {
            className: 'bg-red-500/20 text-red-300 border-red-500/30',
            icon: <XCircleIcon className="h-6 w-6 text-red-400" />
        };
      case 'Warning':
        return {
            className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            icon: <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
        };
      case 'Performance':
        return {
            className: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
            icon: <BoltIcon className="h-6 w-6 text-purple-400" />
        };
      default:
        return {
            className: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
            icon: <InformationCircleIcon className="h-6 w-6 text-gray-400" />
        };
    }
  };

export const AnalysisResult: React.FC<AnalysisResultProps> = ({ isLoading, error, analysis, logContent }) => {
  const [expandedThreats, setExpandedThreats] = useState<Set<number>>(new Set());
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [isReplayModalOpen, setIsReplayModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const replayableEvents = useMemo(() => {
    if (!analysis) return [];
    const allEvents = [
        ...analysis.securityThreats.map(t => ({ ...t, eventType: 'Threat' as const })),
        ...analysis.operationalIssues.map(i => ({ ...i, eventType: 'Issue' as const }))
    ];
    return allEvents
        .filter(e => e.timestamp && e.timestamp !== 'N/A' && !isNaN(new Date(e.timestamp).getTime()))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [analysis]);

  const toggleThreat = (index: number) => {
    setExpandedThreats(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

  const toggleIssue = (index: number) => {
    setExpandedIssues(prev => {
        const newSet = new Set(prev);
        if (newSet.has(index)) {
            newSet.delete(index);
        } else {
            newSet.add(index);
        }
        return newSet;
    });
  };

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
  
  const { summary, securityThreats, operationalIssues, structuredDataItems, structuredDataSummary } = analysis;
  const hasContent = summary || securityThreats.length > 0 || operationalIssues.length > 0 || (structuredDataItems && structuredDataItems.length > 0);

  const handleExportJson = () => {
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
    <>
    <div className="mt-8 max-w-6xl mx-auto space-y-8">
      {/* Summary Section */}
      <div className="p-6 bg-brand-surface border border-brand-border rounded-lg">
        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-brand-primary">Analysis Summary</h2>
            <div className="flex gap-2">
                <button
                    onClick={() => setIsReplayModalOpen(true)}
                    className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text-primary rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    aria-label="Start incident replay"
                    disabled={replayableEvents.length === 0}
                    title={replayableEvents.length === 0 ? "No events with timestamps found for replay" : "Start Incident Replay"}
                >
                    <PlayCircleIcon />
                    Replay
                </button>
                 <button
                    onClick={() => setIsExportModalOpen(true)}
                    className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text-primary rounded-md hover:bg-slate-700 transition-colors flex items-center gap-2"
                    aria-label="Export to external system"
                    title="Export to external system"
                >
                    <ShareIcon />
                    Export
                </button>
                <button
                    onClick={handleExportJson}
                    className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text-primary rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    aria-label="Export analysis results as JSON file"
                >
                    <DownloadIcon />
                    JSON
                </button>
            </div>
        </div>
        <p className="text-brand-text-secondary whitespace-pre-wrap">{summary}</p>
      </div>

      {/* Security Threats Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Security Threats ({securityThreats.length})</h2>
        {securityThreats.length > 0 ? (
          <div className="space-y-4">
            {securityThreats.map((threat, index) => {
                const config = getSeverityConfig(threat.severity);
                const isExpanded = expandedThreats.has(index);
                return (
                    <div key={index} className={`p-4 bg-brand-surface border rounded-lg ${config.borderColor}`}>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 pt-1">{config.icon}</div>
                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${config.className}`}>
                                            {threat.severity}
                                        </span>
                                        <p className="mt-2 text-sm text-brand-text-primary">{threat.description}</p>
                                    </div>
                                    <span className="text-sm font-mono opacity-70 flex-shrink-0 ml-4">{threat.timestamp}</span>
                                </div>
                                <div className="mt-3">
                                    <button
                                        onClick={() => toggleThreat(index)}
                                        className="text-sm text-brand-primary hover:underline flex items-center gap-1"
                                        aria-expanded={isExpanded}
                                        aria-controls={`threat-rec-${index}`}
                                    >
                                        <span>{isExpanded ? 'Hide' : 'Show'} Recommendation</span>
                                        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isExpanded && (
                                        <div id={`threat-rec-${index}`} className="mt-2 pt-3 border-t border-brand-border text-sm text-brand-text-secondary">
                                            {threat.recommendation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
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
            {operationalIssues.map((issue, index) => {
              const config = getIssueTypeConfig(issue.type);
              const isExpanded = expandedIssues.has(index);
              return (
                <div key={index} className={`p-4 border rounded-lg ${config.className}`}>
                    <div className="flex items-start gap-4">
                         <div className="flex-shrink-0">{config.icon}</div>
                         <div className="flex-grow">
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg">{issue.type}</h4>
                                <span className="text-sm font-mono opacity-70">{issue.timestamp}</span>
                            </div>
                            <p className="mt-2 text-sm">{issue.description}</p>
                            <div className="mt-3">
                                <button
                                    onClick={() => toggleIssue(index)}
                                    className="text-sm text-brand-primary hover:underline flex items-center gap-1"
                                    aria-expanded={isExpanded}
                                    aria-controls={`issue-rec-${index}`}
                                >
                                    <span>{isExpanded ? 'Hide' : 'Show'} Recommendation</span>
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                {isExpanded && (
                                    <div id={`issue-rec-${index}`} className="mt-2 pt-3 border-t border-current border-opacity-20">
                                        <p className="text-sm">{issue.recommendation}</p>
                                    </div>
                                )}
                            </div>
                         </div>
                    </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-brand-text-secondary p-4 bg-brand-surface rounded-lg border border-brand-border">No operational issues found.</p>
        )}
      </div>

      {/* Structured Data Section */}
      {structuredDataItems && structuredDataItems.length > 0 && (
        <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CodeBracketIcon />
                Structured Data Insights ({structuredDataItems.length})
            </h2>
            {structuredDataSummary && (
                <p className="text-brand-text-secondary mb-4 p-4 bg-brand-surface rounded-lg border border-brand-border">{structuredDataSummary}</p>
            )}
            <div className="bg-brand-surface rounded-lg border border-brand-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50">
                            <tr>
                                <th scope="col" className="px-4 py-3 font-medium">Key</th>
                                <th scope="col" className="px-4 py-3 font-medium">Value</th>
                                <th scope="col" className="px-4 py-3 font-medium">Context</th>
                                <th scope="col" className="px-4 py-3 font-medium">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {structuredDataItems.map((item, index) => (
                                <tr key={index} className="border-b border-brand-border last:border-b-0 hover:bg-slate-800/30">
                                    <td className="px-4 py-3 font-mono text-brand-primary whitespace-nowrap">{item.key}</td>
                                    <td className="px-4 py-3">{item.value}</td>
                                    <td className="px-4 py-3 text-brand-text-secondary font-mono text-xs truncate max-w-xs">{item.context}</td>
                                    <td className="px-4 py-3 text-brand-text-secondary font-mono whitespace-nowrap">{item.timestamp}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        )}
    </div>
    {isReplayModalOpen && (
        <IncidentReplayModal
            isOpen={isReplayModalOpen}
            onClose={() => setIsReplayModalOpen(false)}
            events={replayableEvents}
        />
    )}
    {isExportModalOpen && (
        <ExportModal
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            analysis={analysis}
            logContent={logContent}
        />
    )}
    </>
  );
};