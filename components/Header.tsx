import React from 'react';
import { SleuthIcon } from './icons/SleuthIcon';
import { User } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
    view: 'analyzer' | 'dashboard';
    setView: (view: 'analyzer' | 'dashboard') => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, view, setView }) => {
  const navLinkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-brand-secondary text-white";
  const inactiveLinkClasses = "text-brand-text-secondary hover:bg-slate-700 hover:text-white";

  return (
    <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SleuthIcon />
          <span className="text-xl font-bold text-white">LOG SLEUTH</span>
        </div>
        
        {user && user.role === 'user' && (
            <nav className="flex items-center space-x-2 bg-brand-bg p-1 rounded-lg">
                <button
                    onClick={() => setView('analyzer')}
                    className={`${navLinkClasses} ${view === 'analyzer' ? activeLinkClasses : inactiveLinkClasses}`}
                >
                    Analyzer
                </button>
                <button
                    onClick={() => setView('dashboard')}
                    className={`${navLinkClasses} ${view === 'dashboard' ? activeLinkClasses : inactiveLinkClasses}`}
                >
                    Dashboard
                </button>
            </nav>
        )}
        {user && user.role === 'admin' && (
             <div className="text-sm font-medium text-brand-text-secondary">Admin Dashboard</div>
        )}

        <div className="flex items-center space-x-4">
            {user && (
                 <span className="text-sm text-brand-text-secondary hidden sm:block">{user.email}</span>
            )}
             <button onClick={onLogout} className="text-brand-text-secondary hover:text-brand-primary transition-colors flex items-center gap-2 p-2 rounded-md hover:bg-slate-700">
                <LogoutIcon />
                <span className="text-sm font-medium">Logout</span>
            </button>
        </div>
      </div>
    </header>
  );
};