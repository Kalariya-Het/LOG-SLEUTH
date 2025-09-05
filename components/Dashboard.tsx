import React, { useMemo } from 'react';
import { HistoryEntry } from '../types';
import { StatCard } from './StatCard';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { WrenchScrewdriverIcon } from './icons/WrenchScrewdriverIcon';
import { BarChart, BarChartData } from './charts/BarChart';
import { AnalysisTimelineChart } from './charts/AnalysisTimelineChart';

interface DashboardProps {
  history: HistoryEntry[];
}

export const Dashboard: React.FC<DashboardProps> = ({ history }) => {
    
  const dashboardStats = useMemo(() => {
    if (history.length === 0) {
      return null;
    }

    const totalAnalyses = history.length;
    let totalThreats = 0;
    let totalIssues = 0;

    const severityCounts: { [key: string]: number } = { Critical: 0, High: 0, Medium: 0, Low: 0, Informational: 0 };
    const issueTypeCounts: { [key: string]: number } = { Error: 0, Warning: 0, Performance: 0, Info: 0 };

    const timelineData = history.map(entry => {
        const threatsInEntry = entry.analysis.securityThreats.length;
        const issuesInEntry = entry.analysis.operationalIssues.length;
        totalThreats += threatsInEntry;
        totalIssues += issuesInEntry;

        entry.analysis.securityThreats.forEach(threat => {
            if (threat.severity in severityCounts) {
                severityCounts[threat.severity]++;
            }
        });
        entry.analysis.operationalIssues.forEach(issue => {
            if (issue.type in issueTypeCounts) {
                issueTypeCounts[issue.type]++;
            }
        });

        return {
            date: new Date(entry.createdAt),
            threats: threatsInEntry,
            issues: issuesInEntry,
            id: entry.id,
        }
    }).reverse(); // To show oldest to newest

    const severityChartData: BarChartData[] = Object.entries(severityCounts)
        .map(([label, value]) => ({ label, value }))
        .filter(d => d.value > 0);
    
    const issueTypeChartData: BarChartData[] = Object.entries(issueTypeCounts)
        .map(([label, value]) => ({ label, value }))
        .filter(d => d.value > 0);

    return {
      totalAnalyses,
      totalThreats,
      totalIssues,
      severityChartData,
      issueTypeChartData,
      timelineData,
    };
  }, [history]);

  if (!dashboardStats) {
    return (
      <div className="text-center py-16">
        <h1 className="text-4xl font-bold mb-4">Dashboard</h1>
        <p className="text-lg text-brand-text-secondary">
          No data available. Run an analysis to see your dashboard.
        </p>
      </div>
    );
  }

  const { totalAnalyses, totalThreats, totalIssues, severityChartData, issueTypeChartData, timelineData } = dashboardStats;
  
  const severityColors: { [key: string]: string } = {
    Critical: '#EF4444',
    High: '#F97316',
    Medium: '#FBBF24',
    Low: '#3B82F6',
    Informational: '#6B7280'
  };

  const issueTypeColors: { [key: string]: string } = {
    Error: '#EF4444',
    Warning: '#F97316',
    Performance: '#A855F7',
    Info: '#6B7280'
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
            title="Total Analyses"
            value={totalAnalyses.toString()}
            icon={<ClipboardListIcon />}
        />
        <StatCard 
            title="Security Threats Found"
            value={totalThreats.toString()}
            icon={<ShieldCheckIcon />}
        />
        <StatCard 
            title="Operational Issues Found"
            value={totalIssues.toString()}
            icon={<WrenchScrewdriverIcon />}
        />
      </div>

      {/* Timeline Chart */}
      {timelineData.length > 0 && (
         <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
            <h2 className="text-2xl font-bold mb-4">Analysis Timeline</h2>
            <AnalysisTimelineChart data={timelineData} />
         </div>
      )}

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {severityChartData.length > 0 && (
            <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                 <h2 className="text-2xl font-bold mb-4">Threat Severity Distribution</h2>
                 <BarChart data={severityChartData} colors={severityColors} />
            </div>
        )}
        {issueTypeChartData.length > 0 && (
            <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                 <h2 className="text-2xl font-bold mb-4">Operational Issue Distribution</h2>
                 <BarChart data={issueTypeChartData} colors={issueTypeColors} />
            </div>
        )}
      </div>

    </div>
  );
};
