import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', id, rows = 3, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-ink uppercase tracking-wider">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={`w-full bg-surface text-ink text-sm rounded-xl border border-line p-3.5 transition-colors placeholder:text-ink-muted/50 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none disabled:bg-surface-subtle disabled:opacity-60 resize-y ${
            error ? 'border-status-error focus:border-status-error focus:ring-status-error' : ''
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-status-error font-medium mt-1">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-ink-muted mt-1">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
