import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SleuthIcon } from './icons/SleuthIcon';
import { User, TriggeredAlert } from '../types';
import { LogoutIcon } from './icons/LogoutIcon';
import { BellIcon } from './icons/BellIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface HeaderProps {
    user: User | null;
    onLogout: () => void;
    view: 'analyzer' | 'dashboard';
    setView: (view: 'analyzer' | 'dashboard') => void;
    triggeredAlerts: TriggeredAlert[];
    onOpenAlertManager: () => void;
    onMarkAllAlertsAsRead: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout, view, setView, triggeredAlerts, onOpenAlertManager, onMarkAllAlertsAsRead }) => {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => triggeredAlerts.filter(a => !a.isRead).length, [triggeredAlerts]);
  const navLinkClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
  const activeLinkClasses = "bg-brand-secondary text-white";
  const inactiveLinkClasses = "text-brand-text-secondary hover:bg-slate-700 hover:text-white";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
            setIsAlertsOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleManageRulesClick = () => {
    setIsAlertsOpen(false);
    onOpenAlertManager();
  }

  const handleMarkAllReadClick = () => {
    onMarkAllAlertsAsRead();
  }
  
  const getAlertIcon = (identifier: string) => {
    switch(identifier) {
        case 'Critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
        case 'High': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />;
        case 'Error': return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
        case 'Warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
        default: return <ExclamationTriangleIcon className="h-5 w-5 text-gray-400" />;
    }
  }

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
            {user && user.role === 'user' && (
                <div className="relative" ref={alertsRef}>
                    <button 
                        onClick={() => setIsAlertsOpen(prev => !prev)} 
                        className="text-brand-text-secondary hover:text-brand-primary transition-colors p-2 rounded-full hover:bg-slate-700"
                        aria-label={`View notifications (${unreadCount} unread)`}
                    >
                        <BellIcon />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-brand-surface">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                    {isAlertsOpen && (
                        <div className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-md bg-brand-surface shadow-lg ring-1 ring-brand-border focus:outline-none">
                            <div className="p-3 flex justify-between items-center border-b border-brand-border">
                                <h3 className="font-bold text-white">Notifications</h3>
                                <button onClick={handleManageRulesClick} className="text-sm text-brand-primary hover:underline">Manage Rules</button>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {triggeredAlerts.length === 0 ? (
                                    <p className="text-center text-brand-text-secondary py-8 px-4">No recent alerts.</p>
                                ) : (
                                    <ul>
                                        {triggeredAlerts.map(alert => (
                                            <li key={alert.id} className={`p-3 border-b border-brand-border/50 ${!alert.isRead ? 'bg-brand-secondary/10' : ''}`}>
                                                <div className="flex items-start gap-3">
                                                    <div className="flex-shrink-0 pt-1">{getAlertIcon(alert.findingIdentifier)}</div>
                                                    <div>
                                                        <p className="text-sm text-brand-text-primary"><span className="font-semibold">{alert.ruleName}</span> triggered</p>
                                                        <p className="text-xs text-brand-text-secondary mt-1 truncate">{alert.findingDescription}</p>
                                                        <p className="text-xs text-brand-text-secondary mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                           {triggeredAlerts.length > 0 && unreadCount > 0 && (
                                <div className="p-2 border-t border-brand-border">
                                    <button onClick={handleMarkAllReadClick} className="w-full text-center text-sm text-brand-primary hover:underline py-1">
                                        Mark all as read
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
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