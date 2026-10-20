import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  verified?: boolean;
}

export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
  verified = false,
}: AvatarProps) {
  const [hasError, setHasError] = React.useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={`relative inline-block flex-shrink-0 ${sizes[size]} ${className}`}>
      <div className="w-full h-full rounded-full overflow-hidden bg-surface-subtle border border-line flex items-center justify-center font-semibold text-brand-deep shadow-sm">
        {src && !hasError ? (
          <img
            src={src}
            alt={name}
            width="80"
            height="80"
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {verified && (
        <span
          title="Verified Mentor"
          className="absolute -bottom-0.5 -right-0.5 bg-brand text-white rounded-full p-0.5 border-2 border-white flex items-center justify-center shadow-xs"
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      )}
    </div>
  );
}
