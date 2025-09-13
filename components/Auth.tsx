import React, { useState, useEffect } from 'react';
import { Login } from './Login';
import { Register } from './Register';
import { SleuthIcon } from './icons/SleuthIcon';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { Session } from '@supabase/supabase-js';

interface AuthProps {
    onLogin: (user: User) => void;
}

type AuthView = 'login' | 'register';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [view, setView] = useState<AuthView>('login');
    const [session, setSession] = useState<Session | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                const user: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: 'user', // Placeholder, fetch from profiles table
                };
                onLogin(user);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
             if (session?.user) {
                const user: User = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: 'user', // Placeholder
                };
                onLogin(user);
            }
        });

        return () => subscription.unsubscribe();
    }, [onLogin]);

    const activeTabClasses = 'border-brand-primary text-brand-primary';
    const inactiveTabClasses = 'border-transparent text-brand-text-secondary hover:text-brand-text-primary hover:border-gray-500';

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
                <div className="p-8">
                    {view === 'login' ? <Login onLogin={onLogin} /> : <Register onRegisterSuccess={() => setView('login')} />}
                </div>
            </div>
             <footer className="text-center py-6 mt-8">
                <p className="text-brand-text-secondary">&copy; {new Date().getFullYear()} LOG SLEUTH. All rights reserved.</p>
            </footer>
        </div>
    );
};