import React, { useState } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { SleuthIcon } from './icons/SleuthIcon';
import { User } from '../types';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';

interface AuthProps {
    onLogin: (user: User) => void;
}

type AuthView = 'login' | 'register' | 'forgotPassword' | 'resetPassword';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [view, setView] = useState<AuthView>('login');
    const [resetToken, setResetToken] = useState<string | null>(null);

    const activeTabClasses = 'border-brand-primary text-brand-primary';
    const inactiveTabClasses = 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-gray-500';

    const handleResetRequestSuccess = (token: string) => {
        setResetToken(token);
        setView('resetPassword');
    };

    const handleResetSuccess = () => {
        setResetToken(null);
        setView('login');
    };

    const renderView = () => {
        switch (view) {
            case 'login':
                return <Login onLogin={onLogin} onForgotPassword={() => setView('forgotPassword')} />;
            case 'register':
                return <Register onRegisterSuccess={() => setView('login')} />;
            case 'forgotPassword':
                return <ForgotPassword onRequestSuccess={handleResetRequestSuccess} onBackToLogin={() => setView('login')} />;
            case 'resetPassword':
                if (resetToken) {
                    return <ResetPassword token={resetToken} onResetSuccess={handleResetSuccess} />;
                }
                // Fallback to login if token is missing
                setView('login');
                return null;
            default:
                return <Login onLogin={onLogin} onForgotPassword={() => setView('forgotPassword')} />;
        }
    }

    return (
        <div className="min-h-screen bg-brand-bg flex flex-col justify-center items-center p-4">
             <div className="text-center mb-8">
                <div className="flex justify-center items-center space-x-3 mb-4">
                    <SleuthIcon />
                    <h1 className="text-4xl font-bold text-white">LOG SLEUTH</h1>
                </div>
                <p className="text-lg text-brand-text-secondary">AI-Powered Log Analysis</p>
            </div>

            <div className="w-full max-w-md bg-brand-surface rounded-lg border border-brand-border shadow-lg">
                {view !== 'forgotPassword' && view !== 'resetPassword' && (
                    <div className="flex border-b border-brand-border">
                        <button 
                            onClick={() => setView('login')} 
                            className={`w-1/2 py-4 text-center font-medium border-b-2 transition-colors ${view === 'login' ? activeTabClasses : inactiveTabClasses}`}
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={() => setView('register')} 
                            className={`w-1/2 py-4 text-center font-medium border-b-2 transition-colors ${view === 'register' ? activeTabClasses : inactiveTabClasses}`}
                        >
                            Create Account
                        </button>
                    </div>
                )}
                <div className="p-8">
                    {renderView()}
                </div>
            </div>
             <footer className="text-center py-6 mt-8">
                <p className="text-brand-text-secondary">&copy; {new Date().getFullYear()} LOG SLEUTH. All rights reserved.</p>
            </footer>
        </div>
    );
};