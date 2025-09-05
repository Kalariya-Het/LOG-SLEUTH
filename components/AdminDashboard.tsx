import React, { useEffect, useState } from 'react';
import * as apiService from '../services/apiService';
import { User, HistoryEntry } from '../types';

interface AdminData {
    user: User;
    history: HistoryEntry[];
}

export const AdminDashboard: React.FC = () => {
    const [data, setData] = useState<AdminData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedUser, setExpandedUser] = useState<string | null>(null);

    useEffect(() => {
        apiService.getAllHistoryForAdmin()
            .then(setData)
            .catch(() => setError("Failed to load admin data."))
            .finally(() => setIsLoading(false));
    }, []);

    const toggleUser = (userId: string) => {
        setExpandedUser(expandedUser === userId ? null : userId);
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading admin data...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-400">{error}</div>;
    }

    const totalUsers = data.length;
    const totalAnalyses = data.reduce((sum, item) => sum + item.history.length, 0);

    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                    <p className="text-sm text-brand-text-secondary">Total Users</p>
                    <p className="text-3xl font-bold">{totalUsers}</p>
                </div>
                <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                    <p className="text-sm text-brand-text-secondary">Total Analyses Performed</p>
                    <p className="text-3xl font-bold">{totalAnalyses}</p>
                </div>
            </div>

            <div className="bg-brand-surface p-6 rounded-lg border border-brand-border">
                <h2 className="text-2xl font-bold mb-4">User Activity</h2>
                <div className="space-y-4">
                    {data.map(({ user, history }) => (
                        <div key={user.id} className="border border-brand-border rounded-lg">
                            <button onClick={() => toggleUser(user.id)} className="w-full flex justify-between items-center p-4 bg-slate-800/50 hover:bg-slate-700/50 transition-colors">
                                <span className="font-semibold">{user.email}</span>
                                <span className="text-sm text-brand-text-secondary">{history.length} analyses</span>
                            </button>
                            {expandedUser === user.id && (
                                <div className="p-4 space-y-2">
                                    {history.length > 0 ? history.map(entry => (
                                        <div key={entry.id} className="p-3 bg-brand-bg rounded-md border border-brand-border/50">
                                            <p className="text-sm font-semibold truncate">{entry.analysis.summary}</p>
                                            <p className="text-xs text-brand-text-secondary mt-1">
                                                {new Date(entry.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                    )) : <p className="text-brand-text-secondary text-sm">No analyses found for this user.</p>}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};