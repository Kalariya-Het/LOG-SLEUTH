
import React from 'react';
import { HistoryEntry } from '../types';
import { ReloadIcon } from './icons/ReloadIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryPanelProps {
  history: HistoryEntry[];
  activeId: string | null;
  onLoad: (id: string) => void;
  onReanalyze: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, activeId, onLoad, onReanalyze, onDelete, onClear }) => {
  return (
    <div className="bg-brand-surface p-4 rounded-lg border border-brand-border h-full flex flex-col min-h-[300px] lg:min-h-0">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">History</h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-brand-text-secondary hover:text-red-400 transition-colors"
            aria-label="Clear all history"
          >
            Clear All
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-center">
            <p className="text-brand-text-secondary">No analysis history found. Your past analyses will appear here.</p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto">
          {history.map((entry) => (
            <li key={entry.id}>
              <div
                onClick={() => onLoad(entry.id)}
                className={`p-3 rounded-md border cursor-pointer transition-all ${
                  activeId === entry.id
                    ? 'bg-brand-secondary/20 border-brand-primary'
                    : 'bg-slate-800/50 border-brand-border hover:border-brand-text-secondary'
                }`}
              >
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-semibold text-brand-text-primary truncate">
                            {entry.analysis.summary.split('\n')[0]}
                        </p>
                        <p className="text-xs text-brand-text-secondary mt-1">
                            {new Date(entry.createdAt).toLocaleString()}
                        </p>
                    </div>
                     <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); onReanalyze(entry.id); }}
                            className="p-1 text-brand-text-secondary hover:text-brand-primary transition-colors"
                            aria-label="Re-analyze this log"
                        >
                            <ReloadIcon />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                            className="p-1 text-brand-text-secondary hover:text-red-400 transition-colors"
                             aria-label="Delete this analysis"
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
