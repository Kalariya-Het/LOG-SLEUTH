
import React from 'react';
import { Feature } from '../types';

interface FeatureCardProps {
  feature: Feature;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-lg border border-brand-border text-center transform hover:scale-105 hover:border-brand-primary transition-all duration-300">
      <div className="flex justify-center items-center mb-4 text-brand-primary">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
      <p className="text-brand-text-secondary">{feature.description}</p>
    </div>
  );
};
