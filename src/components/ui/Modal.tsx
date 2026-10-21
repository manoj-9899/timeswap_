'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog / Bottom Sheet */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${maxWidths[maxWidth]} bg-surface rounded-t-[26px] sm:rounded-modal border border-line shadow-float z-10 max-h-[90dvh] sm:max-h-[85vh] flex flex-col transition-all transform duration-200 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 sm:my-8`}
      >
        {/* Mobile visual sheet drag indicator */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-line" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-8 pt-3 sm:pt-6 pb-3 border-b border-line/60 flex items-start justify-between gap-3">
          <div className="pr-2">
            {title && (
              <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-ink tracking-tight font-editorial">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-ink-muted mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-ink-muted hover:text-ink p-2 rounded-xl hover:bg-surface-subtle transition-colors flex-shrink-0 touch-target flex items-center justify-center -mr-1.5 -mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-5 sm:px-8 py-4 sm:py-6 flex-1 safe-bottom">
          {children}
        </div>
      </div>
    </div>
  );
}
