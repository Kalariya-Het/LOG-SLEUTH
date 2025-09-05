import React, { useState } from 'react';
import * as apiService from '../services/apiService';

interface ResetPasswordProps {
    token: string;
    onResetSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ token, onResetSuccess }) => {
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
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            await apiService.resetPassword(token, password);
            setSuccess("Password reset successfully! You can now sign in with your new password.");
            setTimeout(() => {
                onResetSuccess();
            }, 2000);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Set New Password</h2>
                <p className="text-brand-text-secondary mt-2">Please enter your new password below.</p>
            </div>
             <form onSubmit={handleSubmit} className="space-y-6">
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                {success && <p className="text-green-400 bg-green-900/50 p-3 rounded-md text-sm">{success}</p>}
                
                <div>
                     <label htmlFor="new-password" className="block text-sm font-medium text-brand-text-secondary mb-2">New Password</label>
                    <input
                        id="new-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    />
                </div>
                 <div>
                     <label htmlFor="confirm-new-password" className="block text-sm font-medium text-brand-text-secondary mb-2">Confirm New Password</label>
                    <input
                        id="confirm-new-password"
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
                        className="w-full px-6 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </div>
            </form>
        </div>
    );
};