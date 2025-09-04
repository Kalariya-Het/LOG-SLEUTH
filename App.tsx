
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { LogInput } from './components/LogInput';
import { AnalysisResult } from './components/AnalysisResult';
import { analyzeLogs } from './services/geminiService';
import { LogAnalysis, Feature } from './types';
import { FeatureCard } from './components/FeatureCard';
import { ShieldIcon } from './components/icons/ShieldIcon';
import { AlertIcon } from './components/icons/AlertIcon';
import { ServerIcon } from './components/icons/ServerIcon';

const App: React.FC = () => {
  const [logContent, setLogContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<LogAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!logContent.trim()) {
      setError('Log content cannot be empty.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeLogs(logContent);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? `Analysis failed: ${err.message}` : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [logContent]);

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

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Uncover Insights from Your Logs with AI
          </h1>
          <p className="text-lg text-brand-text-secondary mb-8">
            LOG SLEUTH uses advanced AI to analyze system logs, detect threats, and streamline operations. Paste your logs below or upload a file to get started.
          </p>
        </div>

        <LogInput
          logContent={logContent}
          setLogContent={setLogContent}
          onAnalyze={handleAnalyze}
          isLoading={isLoading}
        />

        <AnalysisResult
          isLoading={isLoading}
          error={error}
          analysis={analysisResult}
        />

        {!analysisResult && !isLoading && (
           <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Why LOG SLEUTH?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <FeatureCard key={index} feature={feature} />
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="text-center py-6 border-t border-brand-border mt-12">
        <p className="text-brand-text-secondary">&copy; {new Date().getFullYear()} LOG SLEUTH. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
