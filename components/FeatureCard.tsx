
import React from 'react';
import { Feature } from '../types';

interface FeatureCardProps {
  feature: Feature;
  onClick?: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, onClick }) => {
  const commonClasses = "bg-brand-surface p-6 rounded-lg border border-brand-border text-center transition-all duration-300 w-full h-full flex flex-col items-center justify-center";
  const interactiveClasses = "cursor-pointer hover:scale-105 hover:border-brand-primary";
  
  const Component = onClick ? 'button' : 'div';
  const props = onClick ? { onClick } : {};

  return (
    <Component
      className={`${commonClasses} ${onClick ? interactiveClasses : 'transform'}`}
      {...props}
    >
      <div className="flex justify-center items-center mb-4 text-brand-primary">
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
      <p className="text-brand-text-secondary">{feature.description}</p>
    </Component>
  );
};