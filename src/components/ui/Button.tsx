import React from 'react';
import Link from 'next/link';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'soft' | 'danger' | 'inverse' | 'ghost-white';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    loading = false, 
    icon, 
    iconPosition = 'left', 
    children, 
    className = '', 
    disabled, 
    href,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none active:scale-[0.98] focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const variants = {
      primary: 'bg-brand hover:bg-brand-deep text-white shadow-subtle hover:shadow-elevated focus-visible:outline-brand',
      secondary: 'bg-surface-subtle hover:bg-[#E5E9DE] text-ink border border-line hover:border-[#D5DAD0] focus-visible:outline-brand',
      outline: 'bg-transparent hover:bg-surface-subtle text-ink border border-line hover:border-ink/20 focus-visible:outline-brand',
      ghost: 'bg-transparent hover:bg-surface-subtle text-ink hover:text-brand-deep focus-visible:outline-brand',
      soft: 'bg-brand-soft hover:bg-[#D5E9D8] text-brand-deep font-semibold focus-visible:outline-brand',
      danger: 'bg-status-error hover:bg-[#9E3434] text-white focus-visible:outline-status-error',
      inverse: 'bg-white hover:bg-canvas text-brand-deep hover:text-brand-dark shadow-subtle hover:shadow-elevated font-semibold focus-visible:outline-white',
      'ghost-white': 'bg-transparent hover:bg-white/10 text-white hover:text-white border border-white/20 focus-visible:outline-white',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[36px] sm:min-h-[32px]',
      md: 'text-sm px-4 py-2 gap-2 min-h-[44px] sm:min-h-[40px]',
      lg: 'text-base px-6 py-2.5 gap-2.5 min-h-[48px]',
    };

    // Filter variant styles if custom className explicitly overrides background or text color
    let variantStyle = variants[variant] || variants.primary;
    if (className) {
      const hasCustomText = /\btext-(?!xs\b|sm\b|base\b|lg\b|xl\b|[0-9])/.test(className);
      const hasCustomBg = /\bbg-/.test(className);
      if (hasCustomText) {
        variantStyle = variantStyle.replace(/\btext-[^\s]+/g, '');
      }
      if (hasCustomBg) {
        variantStyle = variantStyle.replace(/\b(hover:)?bg-[^\s]+/g, '');
      }
    }

    const combinedClasses = `${baseStyles} ${variantStyle} ${sizes[size]} ${className}`.replace(/\s+/g, ' ').trim();

    if (href) {
      return (
        <Link
          href={href}
          className={combinedClasses}
        >
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={combinedClasses}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {!loading && icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
        {!loading && icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
