import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface LoginProps {
    onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            if (data.user) {
                // TODO: Fetch user role from a 'profiles' table after login
                const user: User = {
                    id: data.user.id,
                    email: data.user.email || '',
                    role: 'user', // Placeholder
                };
                onLogin(user);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
             <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-text-secondary mb-2">Email Address</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
            </div>
            <div>
                 <label htmlFor="password" className="block text-sm font-medium text-brand-text-secondary mb-2">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
            </div>
            <div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
            </div>
        </form>
    );
};