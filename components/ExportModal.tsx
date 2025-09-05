import React, { useState } from 'react';
import { LogAnalysis, ExportFormat } from '../types';
import { exportToWebhook } from '../services/apiService';
import { XMarkIcon } from './icons/XMarkIcon';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: LogAnalysis | null;
  logContent: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, analysis, logContent }) => {
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState<ExportFormat>('JSON');
  const [authToken, setAuthToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !analysis) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const payload = format === 'JSON' ? analysis : logContent;

    try {
      await exportToWebhook({ url, format, authToken }, payload);
      setSuccess('Successfully exported data!');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-brand-surface border border-brand-border rounded-lg shadow-xl w-full max-w-lg">
        <div className="p-4 border-b border-brand-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Export to Webhook</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-700">
            <XMarkIcon className="h-5 w-5"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-sm">{error}</p>}
            {success && <p className="text-green-400 bg-green-900/50 p-3 rounded-md text-sm">{success}</p>}

            <div>
                <label htmlFor="export-url" className="block text-sm font-medium text-brand-text-secondary mb-1">
                    Destination URL
                </label>
                <input 
                    id="export-url"
                    type="url" 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    required 
                    placeholder="https://your-endpoint.com/api/logs"
                    className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"
                />
            </div>
            <div>
                <label htmlFor="export-format" className="block text-sm font-medium text-brand-text-secondary mb-1">
                    Data Format
                </label>
                 <select 
                    id="export-format"
                    value={format} 
                    onChange={e => setFormat(e.target.value as ExportFormat)} 
                    className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"
                >
                    <option value="JSON">JSON (Analysis Result)</option>
                    <option value="PlainText">Plain Text (Raw Logs)</option>
                </select>
            </div>
             <div>
                <label htmlFor="export-auth" className="block text-sm font-medium text-brand-text-secondary mb-1">
                    Authorization Header (Optional)
                </label>
                <input 
                    id="export-auth"
                    type="text" 
                    value={authToken} 
                    onChange={e => setAuthToken(e.target.value)} 
                    placeholder="Bearer your-secret-token"
                    className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"
                />
                 <p className="text-xs text-brand-text-secondary mt-1">Value will be sent as `Authorization: Bearer [your-token]`</p>
            </div>
            <div className="flex justify-end items-center gap-4 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-brand-text-primary rounded-md hover:bg-slate-700">
                    Cancel
                </button>
                 <button 
                    type="submit" 
                    className="px-6 py-2 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary disabled:opacity-50 flex items-center justify-center"
                    disabled={isLoading || !url}
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                        </>
                    ) : 'Send'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};