
import React from 'react';

interface IconProps {
  className?: string;
}

export const InformationCircleIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.25.5-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25v-1.5"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v.01M12 15v.01"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
