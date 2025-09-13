import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LogInput } from './components/LogInput';
import { AnalysisResult } from './components/AnalysisResult';
import { analyzeLogs as performAnalysis } from './services/geminiService';
import { LogAnalysis, Feature, HistoryEntry, User } from './types';
import { FeatureCard } from './components/FeatureCard';
import { ShieldIcon } from './components/icons/ShieldIcon';
import { AlertIcon } from './components/icons/AlertIcon';
import { ServerIcon } from './components/icons/ServerIcon';
import { HistoryPanel } from './components/HistoryPanel';
import { Dashboard } from './components/Dashboard';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { supabase } from './services/supabaseClient';
import * as apiService from './services/apiService';
import { Session } from '@supabase/supabase-js';

type View = 'analyzer' | 'dashboard';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<LogAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [view, setView] = useState<View>('analyzer');

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user) {
            const profile = await apiService.getUserProfile(session.user.id);
            setCurrentUser(profile);
        }
    };
    
    fetchSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const profile = await apiService.getUserProfile(session.user.id);
        setCurrentUser(profile);
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  useEffect(() => {
    const fetchHistory = async () => {
        if (currentUser) {
            setIsLoading(true);
            try {
                const userHistory = await apiService.getHistory(currentUser.id);
                setHistory(userHistory);
            } catch (error) {
                setError('Could not fetch history.');
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        } else {
            setHistory([]);
        }
    };
    fetchHistory();
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setLogContent('');
    setAnalysisResult(null);
    setActiveHistoryId(null);
    setView('analyzer');
  };

  const handleAnalyze = useCallback(async (contentToAnalyze: string) => {
    if (!currentUser) {
        setError("You must be logged in to analyze logs.");
        return;
    }
    if (!contentToAnalyze.trim()) {
      setError('Log content cannot be empty.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await performAnalysis(contentToAnalyze);
      setAnalysisResult(result);
      
      const newEntry = await apiService.saveAnalysis(currentUser.id, contentToAnalyze, result);
      setHistory(prevHistory => [newEntry, ...prevHistory]);
      setActiveHistoryId(newEntry.id);

    } catch (err) {
      setError(err instanceof Error ? `Analysis failed: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentUser]);

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
    await apiService.deleteHistory(id);
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

  const features: Feature[] = [
    {
      icon: <ShieldIcon />,
      title: 'Enhanced Security Posture',
      description: 'Proactively identify and address weaknesses before malicious actors can exploit them.',
    },
    {
      icon: <ServerIcon />,
      title: 'Operational Efficiency',
      description: 'Quickly identify and fix problems by analyzing logs to find errors and trends across systems.',
    },
    {
      icon: <AlertIcon />,
      title: 'Risk Mitigation',
      description: 'Prevent costly security breaches by catching and fixing problems early with automated alerts.',
    },
  ];

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }
  
  if (currentUser.role === 'admin') {
      return (
         <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans">
             <Header user={currentUser} onLogout={handleLogout} view="dashboard" setView={() => {}} />
             <main className="container mx-auto px-4 py-8">
                <AdminDashboard />
             </main>
         </div>
      )
  }

  const showWelcomeSection = !analysisResult && !isLoading && history.length === 0;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans">
      <Header user={currentUser} onLogout={handleLogout} view={view} setView={setView} />
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
             
              <LogInput
                logContent={logContent}
                setLogContent={handleLogContentChange}
                onAnalyze={() => handleAnalyze(logContent)}
                isLoading={isAnalyzing} // Changed from isLoading
              />

              <AnalysisResult
                isLoading={isAnalyzing} // Changed from isLoading
                error={error}
                analysis={analysisResult}
              />

              {showWelcomeSection && (
                 <div className="mt-16">
                  <h2 className="text-3xl font-bold text-center mb-8">Why LOG SLEUTH?</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                      <FeatureCard key={index} feature={feature} />
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
    </div>
  );
};

export default App;