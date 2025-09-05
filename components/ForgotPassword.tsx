import React, { useState } from 'react';
import * as apiService from '../services/apiService';

interface ForgotPasswordProps {
    onRequestSuccess: (token: string) => void;
    onBackToLogin: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onRequestSuccess, onBackToLogin }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            const token = await apiService.forgotPassword(email);
            // In a real app, you'd just show the success message.
            // For this simulation, we check if a token was generated for a valid user
            // and proceed to the next step automatically.
            setSuccess("If an account with that email exists, a password reset has been initiated.");
            if (token) {
                setTimeout(() => {
                    onRequestSuccess(token);
                }, 1500); // Wait a moment to show the message
            }
        } catch (err) {
            // This path should not be hit based on current apiService, but good for safety
             setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                <p className="text-brand-text-secondary mt-2">Enter your email and we'll simulate sending you a link to reset your password.</p>
            </div>
             <form onSubmit={handleSubmit} className="space-y-6">
                {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
                {success && <p className="text-green-400 bg-green-900/50 p-3 rounded-md text-sm">{success}</p>}
                <div>
                    <label htmlFor="reset-email" className="block text-sm font-medium text-brand-text-secondary mb-2">Email Address</label>
                    <input
                        id="reset-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none"
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        disabled={isLoading || !!success}
                        className="w-full px-6 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </div>
                 <div>
                    <button
                        type="button"
                        onClick={onBackToLogin}
                        className="w-full text-center text-sm text-brand-primary hover:underline focus:outline-none"
                    >
                        Back to Sign In
                    </button>
                </div>
            </form>
        </div>
    );
};