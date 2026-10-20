import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'interactive' | 'flat';
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  children,
  className = '',
  ...props
}: CardProps) {
  const variants = {
    default: 'bg-surface border border-line shadow-subtle rounded-card',
    subtle: 'bg-surface-subtle border border-line rounded-card',
    interactive: 'bg-surface border border-line shadow-subtle hover:shadow-elevated hover:border-[#D0D6CA] rounded-card transition-all duration-200 cursor-pointer',
    flat: 'bg-surface border border-line rounded-card',
  };

  return (
    <div className={`${variants[variant]} p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
