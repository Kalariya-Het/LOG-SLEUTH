import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { LogInput } from './components/LogInput';
import { AnalysisResult } from './components/AnalysisResult';
import { analyzeLogs as performAnalysis } from './services/geminiService';
import { LogAnalysis, Feature, HistoryEntry, User, AnalysisDepth, AnalysisFocus, AlertRule, TriggeredAlert, SecurityThreat, OperationalIssue } from './types';
import { FeatureCard } from './components/FeatureCard';
import { ShieldIcon } from './components/icons/ShieldIcon';
import { AlertIcon } from './components/icons/AlertIcon';
import { ServerIcon } from './components/icons/ServerIcon';
import { HistoryPanel } from './components/HistoryPanel';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import * as apiService from './services/apiService';
import { AdminDashboard } from './components/AdminDashboard';
import { AlertsManagerModal } from './components/AlertsManagerModal';
import { RewindIcon } from './components/icons/RewindIcon';

type View = 'analyzer' | 'dashboard';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<LogAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [view, setView] = useState<View>('analyzer');
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('Detailed');
  const [analysisFocus, setAnalysisFocus] = useState<AnalysisFocus>('All');
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [triggeredAlerts, setTriggeredAlerts] = useState<TriggeredAlert[]>([]);
  const [isAlertManagerOpen, setIsAlertManagerOpen] = useState(false);
  const logInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = apiService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);
  
  useEffect(() => {
    if (currentUser) {
        setIsLoading(true);
        Promise.all([
            apiService.getHistory(currentUser.id),
            apiService.getAlertRules(currentUser.id),
            apiService.getTriggeredAlerts(currentUser.id)
        ]).then(([userHistory, userAlertRules, userTriggeredAlerts]) => {
            setHistory(userHistory);
            setAlertRules(userAlertRules);
            setTriggeredAlerts(userTriggeredAlerts);
        }).finally(() => {
            setIsLoading(false);
        });
    } else {
        setHistory([]);
        setAlertRules([]);
        setTriggeredAlerts([]);
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    apiService.logout();
    setCurrentUser(null);
    setLogContent('');
    setAnalysisResult(null);
    setActiveHistoryId(null);
    setView('analyzer');
  };

  const checkAlerts = useCallback(async (analysis: LogAnalysis, historyEntryId: string) => {
    if (!currentUser) return;
    
    const newAlertsToCreate: Omit<TriggeredAlert, 'id' | 'userId'>[] = [];

    alertRules.forEach(rule => {
        if (rule.triggerOn === 'Security') {
            analysis.securityThreats.forEach(threat => {
                const severitiesMatch = rule.severities.length === 0 || rule.severities.includes(threat.severity);
                const keywordMatch = !rule.keyword || threat.description.toLowerCase().includes(rule.keyword.toLowerCase());
                if (severitiesMatch && keywordMatch) {
                    newAlertsToCreate.push({
                        ruleName: rule.name,
                        historyEntryId,
                        findingDescription: threat.description,
                        findingIdentifier: threat.severity,
                        timestamp: new Date().toISOString(),
                        isRead: false,
                    });
                }
            });
        } else if (rule.triggerOn === 'Operational') {
            analysis.operationalIssues.forEach(issue => {
                const typesMatch = rule.issueTypes.length === 0 || rule.issueTypes.includes(issue.type);
                const keywordMatch = !rule.keyword || issue.description.toLowerCase().includes(rule.keyword.toLowerCase());
                if (typesMatch && keywordMatch) {
                     newAlertsToCreate.push({
                        ruleName: rule.name,
                        historyEntryId,
                        findingDescription: issue.description,
                        findingIdentifier: issue.type,
                        timestamp: new Date().toISOString(),
                        isRead: false,
                    });
                }
            });
        }
    });

    if (newAlertsToCreate.length > 0) {
        const createdAlerts = await apiService.createTriggeredAlerts(currentUser.id, newAlertsToCreate);
        setTriggeredAlerts(prev => [...createdAlerts, ...prev].slice(0, 50));
    }
  }, [alertRules, currentUser]);

  const handleAnalyze = useCallback(async (contentToAnalyze: string) => {
    if (!currentUser) {
        setError("You must be logged in to analyze logs.");
        return;
    }
    if (!contentToAnalyze.trim()) {
      setError('Log content cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await performAnalysis(contentToAnalyze, analysisDepth, analysisFocus);
      setAnalysisResult(result);
      
      const newEntry = await apiService.saveAnalysis(currentUser.id, contentToAnalyze, result);
      setHistory(prevHistory => [newEntry, ...prevHistory]);
      setActiveHistoryId(newEntry.id);
      await checkAlerts(result, newEntry.id);

    } catch (err) {
      setError(err instanceof Error ? `Analysis failed: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, analysisDepth, analysisFocus, checkAlerts]);

  const handleLogContentChange = (content: string) => {
    setLogContent(content);
    if(activeHistoryId) {
        setActiveHistoryId(null);
        setAnalysisResult(null);
    }
  };

  const handleLoadHistory = useCallback((id: string) => {
    const entry = history.find(item => item.id === id);
    if (entry) {
      setLogContent(entry.logContent);
      setAnalysisResult(entry.analysis);
      setActiveHistoryId(id);
      setError(null);
      setIsLoading(false);
      setView('analyzer');
    }
  }, [history]);

  const handleReanalyzeHistory = useCallback((id: string) => {
    const entry = history.find(item => item.id === id);
    if (entry) {
      setLogContent(entry.logContent);
      setActiveHistoryId(null);
      setView('analyzer');
      handleAnalyze(entry.logContent);
    }
  }, [history, handleAnalyze]);

  const handleDeleteHistory = useCallback(async (id: string) => {
    if(!currentUser) return;
    await apiService.deleteHistory(currentUser.id, id);
    setHistory(prev => prev.filter(item => item.id !== id));
    if (activeHistoryId === id) {
      setLogContent('');
      setAnalysisResult(null);
      setActiveHistoryId(null);
    }
  }, [activeHistoryId, currentUser]);
  
  const handleClearHistory = useCallback(async () => {
    if(!currentUser) return;
    if(window.confirm("Are you sure you want to clear all your analysis history? This action cannot be undone.")){
        await apiService.clearHistory(currentUser.id);
        setHistory([]);
        setLogContent('');
        setAnalysisResult(null);
        setActiveHistoryId(null);
    }
  }, [currentUser]);

  const handleSaveAlertRule = useCallback(async (rule: Omit<AlertRule, 'id' | 'userId'>) => {
    if (!currentUser) return;
    const newRule = await apiService.saveAlertRule(currentUser.id, rule);
    setAlertRules(prev => [...prev, newRule]);
  }, [currentUser]);

  const handleDeleteAlertRule = useCallback(async (ruleId: string) => {
      if (!currentUser) return;
      await apiService.deleteAlertRule(currentUser.id, ruleId);
      setAlertRules(prev => prev.filter(r => r.id !== ruleId));
  }, [currentUser]);

  const handleMarkAllAlertsAsRead = useCallback(async () => {
      if (!currentUser) return;
      const updatedAlerts = await apiService.markAllAlertsAsRead(currentUser.id);
      setTriggeredAlerts(updatedAlerts);
  }, [currentUser]);

  const handleScrollToInput = () => {
    logInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const features: Feature[] = [
    {
      icon: <ShieldIcon />,
      title: 'Enhanced Security Posture',
      description: 'Proactively identify and address weaknesses before malicious actors can exploit them.',
    },
    {
      icon: <ServerIcon />,
      title: 'Operational Efficiency',
      description: 'Quickly identify problems by analyzing logs to find errors and trends across your systems.',
    },
    {
      icon: <AlertIcon />,
      title: 'Risk Mitigation',
      description: 'Prevent costly security breaches by catching problems early with automated alerts.',
    },
    {
      icon: <RewindIcon />,
      title: 'AI-Driven Incident Replay',
      description: 'Visualize incidents as an interactive timeline. Rewind and replay event sequences to understand root causes.',
    },
  ];

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }
  
  if (currentUser.role === 'admin') {
      return (
         <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans">
             <Header user={currentUser} onLogout={handleLogout} view="dashboard" setView={() => {}} triggeredAlerts={[]} onOpenAlertManager={() => {}} onMarkAllAlertsAsRead={() => {}}/>
             <main className="container mx-auto px-4 py-8">
                <AdminDashboard />
             </main>
         </div>
      )
  }

  const showWelcomeSection = !analysisResult && !isLoading && history.length === 0;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans">
      <Header 
        user={currentUser} 
        onLogout={handleLogout} 
        view={view} 
        setView={setView} 
        triggeredAlerts={triggeredAlerts}
        onOpenAlertManager={() => setIsAlertManagerOpen(true)}
        onMarkAllAlertsAsRead={handleMarkAllAlertsAsRead}
        />
      <main className="container mx-auto px-4 py-8">
        {view === 'analyzer' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-4 xl:col-span-3">
              <HistoryPanel
                history={history}
                activeId={activeHistoryId}
                onLoad={handleLoadHistory}
                onReanalyze={handleReanalyzeHistory}
                onDelete={handleDeleteHistory}
                onClear={handleClearHistory}
              />
            </aside>
            <div className="lg:col-span-8 xl:col-span-9">
              {showWelcomeSection && (
                 <div className="text-center max-w-3xl mx-auto mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                      Uncover Insights from Your Logs with AI
                    </h1>
                    <p className="text-lg text-brand-text-secondary mb-8">
                      LOG SLEUTH uses advanced AI to analyze system logs, detect threats, and streamline operations. Paste your logs below or upload a file to get started.
                    </p>
                  </div>
              )}
             
              <div ref={logInputRef} className="scroll-mt-24">
                <LogInput
                    logContent={logContent}
                    setLogContent={handleLogContentChange}
                    onAnalyze={() => handleAnalyze(logContent)}
                    isLoading={isLoading}
                    analysisDepth={analysisDepth}
                    setAnalysisDepth={setAnalysisDepth}
                    analysisFocus={analysisFocus}
                    setAnalysisFocus={setAnalysisFocus}
                />
              </div>

              <AnalysisResult
                isLoading={isLoading}
                error={error}
                analysis={analysisResult}
                logContent={logContent}
              />

              {showWelcomeSection && (
                 <div className="mt-16">
                  <h2 className="text-3xl font-bold text-center mb-8">Why LOG SLEUTH?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {features.map((feature, index) => (
                      <FeatureCard 
                        key={index} 
                        feature={feature}
                        onClick={feature.title === 'AI-Driven Incident Replay' ? handleScrollToInput : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Dashboard history={history} />
        )}
      </main>
      <footer className="text-center py-6 border-t border-brand-border mt-12">
        <p className="text-brand-text-secondary">&copy; {new Date().getFullYear()} LOG SLEUTH. All rights reserved.</p>
      </footer>

      {isAlertManagerOpen && (
        <AlertsManagerModal 
            isOpen={isAlertManagerOpen}
            onClose={() => setIsAlertManagerOpen(false)}
            rules={alertRules}
            onSave={handleSaveAlertRule}
            onDelete={handleDeleteAlertRule}
        />
      )}
    </div>
  );
};

export default App;