import React, { useState } from 'react';
import * as apiService from '../services/apiService';

interface RegisterProps {
    onRegisterSuccess: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onRegisterSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setError(null);
        setSuccess(null);
        setIsLoading(true);
        try {
            await apiService.register(email, password);
            setSuccess("Account created successfully! You can now sign in.");
            setTimeout(() => {
                onRegisterSuccess();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
            {success && <p className="text-green-400 bg-green-900/50 p-3 rounded-md text-sm">{success}</p>}
             <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-brand-text-secondary mb-2">Email Address</label>
                <input
                    id="reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
            </div>
            <div>
                 <label htmlFor="reg-password" className="block text-sm font-medium text-brand-text-secondary mb-2">Password</label>
                <input
                    id="reg-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
            </div>
             <div>
                 <label htmlFor="confirm-password" className="block text-sm font-medium text-brand-text-secondary mb-2">Confirm Password</label>
                <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                />
            </div>
            <div>
                <button
                    type="submit"
                    disabled={isLoading || !!success}
                    className="w-full px-6 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
            </div>
        </form>
    );
};