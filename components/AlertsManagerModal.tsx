import React, { useState } from 'react';
import { AlertRule, SecurityThreat, OperationalIssue } from '../types';
import { TrashIcon } from './icons/TrashIcon';

interface AlertsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AlertRule[];
  onSave: (rule: Omit<AlertRule, 'id' | 'userId'>) => void;
  onDelete: (ruleId: string) => void;
}

type TriggerType = 'Security' | 'Operational';

const securitySeverities: SecurityThreat['severity'][] = ['Critical', 'High', 'Medium', 'Low', 'Informational'];
const operationalTypes: OperationalIssue['type'][] = ['Error', 'Warning', 'Performance', 'Info'];

export const AlertsManagerModal: React.FC<AlertsManagerModalProps> = ({ isOpen, onClose, rules, onSave, onDelete }) => {
  const [name, setName] = useState('');
  const [triggerOn, setTriggerOn] = useState<TriggerType>('Security');
  const [selectedSeverities, setSelectedSeverities] = useState<Set<SecurityThreat['severity']>>(new Set());
  const [selectedIssueTypes, setSelectedIssueTypes] = useState<Set<OperationalIssue['type']>>(new Set());
  const [keyword, setKeyword] = useState('');
  
  if (!isOpen) return null;

  const handleSeverityChange = (severity: SecurityThreat['severity']) => {
    setSelectedSeverities(prev => {
        const newSet = new Set(prev);
        if (newSet.has(severity)) newSet.delete(severity);
        else newSet.add(severity);
        return newSet;
    });
  };

  const handleIssueTypeChange = (type: OperationalIssue['type']) => {
    setSelectedIssueTypes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(type)) newSet.delete(type);
        else newSet.add(type);
        return newSet;
    });
  };

  const resetForm = () => {
    setName('');
    setTriggerOn('Security');
    setSelectedSeverities(new Set());
    setSelectedIssueTypes(new Set());
    setKeyword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    onSave({
        name,
        triggerOn,
        severities: Array.from(selectedSeverities),
        issueTypes: Array.from(selectedIssueTypes),
        keyword,
    });
    resetForm();
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" aria-modal="true" role="dialog">
      <div className="bg-brand-surface border border-brand-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-brand-border flex justify-between items-center">
          <h2 className="text-xl font-bold">Manage Alert Rules</h2>
          <button onClick={onClose} className="text-brand-text-secondary hover:text-white">&times;</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            {/* New Rule Form */}
            <form onSubmit={handleSubmit} className="p-4 border border-brand-border rounded-lg space-y-4">
                <h3 className="font-semibold text-lg">Create New Rule</h3>
                <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-1">Rule Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-1">Trigger On</label>
                    <select value={triggerOn} onChange={e => setTriggerOn(e.target.value as TriggerType)} className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary">
                        <option value="Security">Security Threat</option>
                        <option value="Operational">Operational Issue</option>
                    </select>
                </div>
                {triggerOn === 'Security' && (
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">Severities (optional, checks all if none selected)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {securitySeverities.map(s => (
                                <label key={s} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={selectedSeverities.has(s)} onChange={() => handleSeverityChange(s)} className="form-checkbox bg-brand-bg border-brand-border text-brand-primary focus:ring-brand-primary"/>
                                    <span>{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                 {triggerOn === 'Operational' && (
                    <div>
                        <label className="block text-sm font-medium text-brand-text-secondary mb-2">Issue Types (optional, checks all if none selected)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {operationalTypes.map(t => (
                                <label key={t} className="flex items-center space-x-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={selectedIssueTypes.has(t)} onChange={() => handleIssueTypeChange(t)} className="form-checkbox bg-brand-bg border-brand-border text-brand-primary focus:ring-brand-primary"/>
                                    <span>{t}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-brand-text-secondary mb-1">Keyword (optional)</label>
                    <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g., 'failed login'" className="w-full p-2 bg-brand-bg border border-brand-border rounded-md focus:ring-2 focus:ring-brand-primary"/>
                </div>
                <button type="submit" className="px-4 py-2 bg-brand-secondary text-white font-bold rounded-md hover:bg-brand-primary disabled:opacity-50" disabled={!name}>Add Rule</button>
            </form>

            {/* Existing Rules List */}
            <div>
                 <h3 className="font-semibold text-lg mb-2">Existing Rules</h3>
                 <div className="space-y-2">
                    {rules.length === 0 ? (
                        <p className="text-brand-text-secondary text-sm">No rules created yet.</p>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="p-3 bg-slate-800/50 border border-brand-border rounded-md flex justify-between items-center">
                               <div>
                                   <p className="font-semibold">{rule.name}</p>
                                   <p className="text-xs text-brand-text-secondary mt-1">
                                       Trigger: {rule.triggerOn} {rule.keyword && ` | Keyword: "${rule.keyword}"`}
                                   </p>
                               </div>
                                <button onClick={() => onDelete(rule.id)} className="p-2 text-brand-text-secondary hover:text-red-400" aria-label={`Delete rule ${rule.name}`}>
                                    <TrashIcon />
                                </button>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};
