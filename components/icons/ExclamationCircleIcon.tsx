
import React from 'react';

interface IconProps {
  className?: string;
}

export const ExclamationCircleIcon: React.FC<IconProps> = ({ className }) => (
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
      d="M12 9v3.75m.99-11.25.247.458a24.952 24.952 0 01-4.582 0l.247-.458a24.952 24.952 0 014.582 0zM12 18.75a.75.75 0 100-1.5.75.75 0 000 1.5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.25.5-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25-2.5 2.5.5.25 2.5-2.5.5.25"
    />
  </svg>
);
