
import React from 'react';

interface IconProps {
  className?: string;
}

export const ShieldExclamationIcon: React.FC<IconProps> = ({ className }) => (
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
      d="M12 9v3.75m-2.036 3.328a.75.75 0 01-1.06 0l-1.62-1.62a.75.75 0 010-1.06l1.62-1.62a.75.75 0 011.06 0l1.62 1.62a.75.75 0 010 1.06l-1.62 1.62zM12 9v3.75m6.364 3.328a.75.75 0 001.06 0l1.62-1.62a.75.75 0 000-1.06l-1.62-1.62a.75.75 0 00-1.06 0l-1.62 1.62a.75.75 0 000 1.06l1.62 1.62zM9.75 12a.75.75 0 010-1.06l1.62-1.62a.75.75 0 011.06 0l1.62 1.62a.75.75 0 010 1.06l-1.62 1.62a.75.75 0 01-1.06 0l-1.62-1.62z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 000-18h-1.5a9 9 0 00-9 9v1.5a9 9 0 009 9z"
    />
  </svg>
);
