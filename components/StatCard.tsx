import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  return (
    <div className="bg-brand-surface p-6 rounded-lg border border-brand-border flex items-center space-x-4">
      <div className="bg-brand-secondary/20 p-3 rounded-full text-brand-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm text-brand-text-secondary">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </div>
  );
};
