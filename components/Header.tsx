
import React from 'react';
import { SleuthIcon } from './icons/SleuthIcon';

export const Header: React.FC = () => {
  return (
    <header className="bg-brand-surface border-b border-brand-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SleuthIcon />
          <span className="text-xl font-bold text-white">LOG SLEUTH</span>
        </div>
        <nav>
          <a href="#" className="text-brand-text-secondary hover:text-brand-primary transition-colors">
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
};
