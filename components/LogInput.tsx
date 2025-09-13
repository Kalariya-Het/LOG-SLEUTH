
import React, { useRef, ChangeEvent } from 'react';

interface LogInputProps {
  logContent: string;
  setLogContent: (content: string) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CONTENT_LENGTH = 100000; // 100k characters

export const LogInput: React.FC<LogInputProps> = ({ logContent, setLogContent, onAnalyze, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        alert('File size too large. Please select a file smaller than 5MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text.length > MAX_CONTENT_LENGTH) {
          const truncated = text.slice(0, MAX_CONTENT_LENGTH);
          setLogContent(truncated);
          alert(`File content was truncated to ${MAX_CONTENT_LENGTH} characters for optimal performance.`);
        } else {
          setLogContent(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setLogContent(newContent);
    }
  };

  const getCharacterCountColor = () => {
    const length = logContent.length;
    if (length > MAX_CONTENT_LENGTH * 0.9) return 'text-red-400';
    if (length > MAX_CONTENT_LENGTH * 0.7) return 'text-yellow-400';
    return 'text-brand-text-secondary';
  };

  const canAnalyze = logContent.trim().length >= 50 && logContent.length <= MAX_CONTENT_LENGTH;

  return (
    <div className="max-w-4xl mx-auto bg-brand-surface p-6 rounded-lg border border-brand-border shadow-lg">
      <div className="relative">
        <textarea
          className="w-full h-64 p-4 bg-brand-bg border border-brand-border rounded-md text-brand-text-primary focus:ring-2 focus:ring-brand-primary focus:outline-none resize-y font-mono text-sm"
          placeholder="Paste your logs here... (minimum 50 characters for analysis)"
          value={logContent}
          onChange={handleTextChange}
          disabled={isLoading}
        />
        <div className="absolute bottom-2 right-2 text-xs">
          <span className={getCharacterCountColor()}>
            {logContent.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
          </span>
        </div>
      </div>
      
      {logContent.length > 0 && logContent.length < 50 && (
        <div className="mt-2 text-sm text-yellow-400">
          ⚠️ Need at least 50 characters for meaningful analysis
        </div>
      )}
      
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".log,.txt,text/plain"
            />
            <button
                onClick={handleUploadClick}
                className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text-primary rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                disabled={isLoading}
            >
                Upload Log File
            </button>
            <span className="text-sm text-brand-text-secondary">.log, .txt files (max 5MB)</span>
        </div>
        <button
          onClick={onAnalyze}
          className="w-full sm:w-auto px-6 py-3 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          disabled={isLoading || !canAnalyze}
          title={!canAnalyze ? 'Need 50-100,000 characters for analysis' : 'Analyze logs with AI'}
        >
          {isLoading ? (
             <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Analyzing... (this may take up to 30 seconds)
            </>
          ) : (
            'Analyze Logs'
          )}
        </button>
      </div>
    </div>
  );
};
