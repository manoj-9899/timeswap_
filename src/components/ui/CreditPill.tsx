import React from 'react';
import { Clock } from 'lucide-react';

interface CreditPillProps {
  amount: number;
  type?: 'balance' | 'cost' | 'earned' | 'spent';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function CreditPill({
  amount,
  type = 'balance',
  size = 'md',
  showLabel = true,
  className = '',
}: CreditPillProps) {
  const formatted = Math.round(amount).toString();

  const colors = {
    balance: 'bg-brand-soft text-brand-deep border-brand/20',
    cost: 'bg-accent-peach-light text-[#733F23] border-[#F0D5C4]',
    earned: 'bg-[#E7F5EC] text-brand-deep border-[#C9E7D2]',
    spent: 'bg-surface-subtle text-ink-muted border-line',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const prefix = type === 'earned' ? '+' : type === 'spent' ? '-' : '';

  return (
    <span
      className={`inline-flex items-center rounded-pill border font-medium select-none ${colors[type]} ${sizes[size]} ${className}`}
      title={`${amount} Time Credit${amount === 1 ? '' : 's'} (${amount * 60} minutes of learning)`}
    >
      <Clock className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3 text-current opacity-80'} />
      <span className="font-semibold tracking-tight">
        {prefix}{formatted}
      </span>
      {showLabel && (
        <span className="text-[11px] opacity-85 lowercase">
          {amount === 1 ? 'credit' : 'credits'}
        </span>
      )}
    </span>
  );
}
