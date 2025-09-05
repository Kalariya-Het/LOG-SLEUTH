import React, { useState, useEffect, useRef } from 'react';
import { SecurityThreat, OperationalIssue } from '../types';
import { XMarkIcon } from './icons/XMarkIcon';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import { ForwardIcon } from './icons/ForwardIcon';
import { BackwardIcon } from './icons/BackwardIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ExclamationCircleIcon } from './icons/ExclamationCircleIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BoltIcon } from './icons/BoltIcon';

type TimelineEvent = (SecurityThreat & { eventType: 'Threat' }) | (OperationalIssue & { eventType: 'Issue' });

interface IncidentReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: TimelineEvent[];
}

const getEventConfig = (event: TimelineEvent) => {
    if (event.eventType === 'Threat') {
        switch (event.severity) {
            case 'Critical': return { icon: <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />, color: 'bg-red-500' };
            case 'High': return { icon: <ExclamationCircleIcon className="h-5 w-5 text-orange-400" />, color: 'bg-orange-500' };
            case 'Medium': return { icon: <ShieldExclamationIcon className="h-5 w-5 text-yellow-400" />, color: 'bg-yellow-500' };
            case 'Low': return { icon: <InformationCircleIcon className="h-5 w-5 text-blue-400" />, color: 'bg-blue-500' };
            default: return { icon: <InformationCircleIcon className="h-5 w-5 text-gray-400" />, color: 'bg-gray-500' };
        }
    } else { // Issue
        switch (event.type) {
            case 'Error': return { icon: <XCircleIcon className="h-5 w-5 text-red-400" />, color: 'bg-red-500' };
            case 'Warning': return { icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />, color: 'bg-yellow-500' };
            case 'Performance': return { icon: <BoltIcon className="h-5 w-5 text-purple-400" />, color: 'bg-purple-500' };
            default: return { icon: <InformationCircleIcon className="h-5 w-5 text-gray-400" />, color: 'bg-gray-500' };
        }
    }
}

export const IncidentReplayModal: React.FC<IncidentReplayModalProps> = ({ isOpen, onClose, events }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const activeItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsPlaying(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: number;
    if (isPlaying && events.length > 0) {
      interval = window.setInterval(() => {
        setCurrentStep(prev => (prev + 1) >= events.length ? 0 : prev + 1);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, events.length]);
  
  useEffect(() => {
    activeItemRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
  }, [currentStep]);

  if (!isOpen) return null;

  const currentEvent = events[currentStep];

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, events.length - 1));
  const handlePrev = () => setCurrentStep(prev => Math.max(prev - 1, 0));
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentStep(Number(e.target.value));

  return (
    <div className="fixed inset-0 bg-brand-bg/90 z-50 flex flex-col p-4 sm:p-8" aria-modal="true" role="dialog">
      <header className="flex-shrink-0 flex justify-between items-center pb-4">
        <h2 className="text-2xl font-bold text-brand-primary">Incident Replay Timeline</h2>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-brand-surface">
          <XMarkIcon className="h-6 w-6" />
        </button>
      </header>
      
      <main className="flex-grow flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Timeline */}
        <div className="w-full md:w-1/3 h-1/2 md:h-full flex flex-col bg-brand-surface p-4 rounded-lg border border-brand-border">
            <h3 className="font-bold mb-4 text-lg">Event Sequence</h3>
            <ul className="overflow-y-auto pr-4 space-y-4">
                {events.map((event, index) => {
                    const isActive = index === currentStep;
                    const config = getEventConfig(event);
                    return (
                        <li key={index} ref={isActive ? activeItemRef : null} className="flex gap-4 cursor-pointer" onClick={() => setCurrentStep(index)}>
                            <div className="flex flex-col items-center">
                                <div className={`w-1 flex-grow ${isActive ? config.color : 'bg-brand-border'}`}></div>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isActive ? `${config.color} ring-4 ring-brand-primary/50` : 'bg-brand-border'}`}>
                                    {isActive && <div className="w-2 h-2 bg-white rounded-full"></div>}
                                </div>
                                <div className={`w-1 flex-grow ${isActive ? config.color : 'bg-brand-border'}`}></div>
                            </div>
                            <div className={`py-1 ${isActive ? '' : 'opacity-60'}`}>
                                <p className="font-semibold text-sm">{event.eventType === 'Threat' ? event.severity : event.type}</p>
                                <p className="text-xs text-brand-text-secondary">{new Date(event.timestamp).toLocaleString()}</p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>

        {/* Details and Controls */}
        <div className="w-full md:w-2/3 h-1/2 md:h-full flex flex-col gap-8">
            {/* Details */}
            <div className="flex-grow bg-brand-surface p-6 rounded-lg border border-brand-border overflow-y-auto">
                {currentEvent ? (
                    <>
                        <div className="flex justify-between items-start mb-4">
                             <div>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getEventConfig(currentEvent).color} text-white`}>
                                    {currentEvent.eventType === 'Threat' ? currentEvent.severity : currentEvent.type}
                                </span>
                                <p className="text-xs text-brand-text-secondary mt-2">
                                    {new Date(currentEvent.timestamp).toLocaleString()}
                                </p>
                             </div>
                             {getEventConfig(currentEvent).icon}
                        </div>
                        
                        <h4 className="font-bold text-lg mb-2">Description</h4>
                        <p className="text-sm text-brand-text-secondary mb-4">{currentEvent.description}</p>
                        
                        <h4 className="font-bold text-lg mb-2">Recommendation</h4>
                        <p className="text-sm text-brand-text-secondary mb-4">{currentEvent.recommendation}</p>

                        {currentEvent.logLine && currentEvent.logLine !== 'N/A' && (
                            <div className="mt-4 pt-4 border-t border-brand-border">
                                <h4 className="font-bold text-lg mb-2">Associated Log Line</h4>
                                <pre className="bg-brand-bg p-3 rounded-md text-sm text-brand-text-primary font-mono whitespace-pre-wrap break-all">
                                    <code>{currentEvent.logLine}</code>
                                </pre>
                            </div>
                        )}
                    </>
                ) : (
                    <p>No event selected.</p>
                )}
            </div>

            {/* Controls */}
            <div className="flex-shrink-0 bg-brand-surface p-4 rounded-lg border border-brand-border">
                <div className="flex items-center justify-center gap-4 mb-4">
                    <button onClick={handlePrev} disabled={currentStep === 0} className="p-2 disabled:opacity-50"><BackwardIcon /></button>
                    <button onClick={() => setIsPlaying(!isPlaying)} className="p-3 bg-brand-primary rounded-full text-brand-bg">
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button onClick={handleNext} disabled={currentStep === events.length - 1} className="p-2 disabled:opacity-50"><ForwardIcon /></button>
                </div>

                {/* Interactive Visual Timeline */}
                <div className="flex items-center gap-1.5 my-3 px-2">
                    {events.map((event, index) => {
                        const isActive = index === currentStep;
                        const config = getEventConfig(event);
                        return (
                            <button
                                key={index}
                                onClick={() => setCurrentStep(index)}
                                className={`h-2 flex-1 rounded-full transition-all duration-300 transform ${isActive ? `${config.color} scale-y-150` : 'bg-brand-border hover:bg-slate-600'}`}
                                title={`${event.eventType === 'Threat' ? event.severity : event.type} at ${new Date(event.timestamp).toLocaleString()}`}
                                aria-label={`Go to event ${index + 1}`}
                            />
                        );
                    })}
                </div>

                 <input
                    type="range"
                    min="0"
                    max={events.length > 0 ? events.length - 1 : 0}
                    value={currentStep}
                    onChange={handleSliderChange}
                    className="w-full h-2 bg-brand-border rounded-lg appearance-none cursor-pointer"
                    disabled={events.length === 0}
                />
            </div>
        </div>
      </main>
    </div>
  );
};