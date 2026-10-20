import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'neutral' | 'peach' | 'yellow' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  icon,
}: BadgeProps) {
  const variants = {
    brand: 'bg-brand-soft text-brand-deep border border-brand/20 font-medium',
    neutral: 'bg-surface-subtle text-ink-muted border border-line font-medium',
    peach: 'bg-[#FBECE1] text-[#7A4323] border border-[#F2DACB] font-medium',
    yellow: 'bg-accent-yellow-light text-[#6E5B10] border border-accent-yellow font-medium',
    success: 'bg-[#E7F5EC] text-brand-deep border border-[#CCE8D4] font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium',
    error: 'bg-red-50 text-status-error border border-red-200 font-medium',
    outline: 'bg-transparent text-ink border border-line font-normal',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-pill select-none transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
