import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: number | string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = '',
  size = 'md',
}: TabsProps) {
  return (
    <div className={`flex items-center gap-1.5 p-1 bg-surface-subtle border border-line rounded-xl overflow-x-auto no-scrollbar ${className}`}>
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 select-none ${
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'
            } ${
              isActive
                ? 'bg-surface text-ink font-semibold shadow-xs border border-line/80'
                : 'text-ink-muted hover:text-ink hover:bg-surface/50'
            }`}
          >
            {tab.icon && <span className="opacity-75">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isActive
                    ? 'bg-brand-soft text-brand-deep'
                    : 'bg-surface text-ink-muted border border-line'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
