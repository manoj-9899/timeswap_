'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  Calendar, 
  MessageSquare, 
  Wallet, 
  User, 
  Sparkles,
  LogIn,
  HelpCircle,
  Clock
} from 'lucide-react';
import { useTimeSwap } from '../lib/store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  badge?: number;
  badgeContent?: string;
}

export function MobileNav() {
  const pathname = usePathname();
  const { currentUser, authUserId, isDemoMode, conversations, sessions } = useTimeSwap();

  // Hide bottom nav during focused auth/onboarding workflows and offline screen
  if (
    pathname.startsWith('/auth') || 
    pathname === '/onboarding' || 
    pathname === '/offline' ||
    pathname.includes('/complete')
  ) {
    return null;
  }

  const isAuthenticated = Boolean(authUserId || (isDemoMode && currentUser?.id && currentUser.id !== ''));

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const pendingSessionsCount = sessions.filter(s => s.status === 'pending').length;

  const authNavItems: NavItem[] = [
    {
      label: 'Discover',
      href: '/discover',
      icon: Compass,
      isActive: pathname === '/discover',
    },
    {
      label: 'Sessions',
      href: '/sessions',
      icon: Calendar,
      isActive: pathname.startsWith('/sessions'),
      badge: pendingSessionsCount > 0 ? pendingSessionsCount : undefined,
    },
    {
      label: 'Messages',
      href: '/messages',
      icon: MessageSquare,
      isActive: pathname.startsWith('/messages'),
      badge: totalUnreadMessages > 0 ? totalUnreadMessages : undefined,
    },
    {
      label: 'Wallet',
      href: '/wallet',
      icon: Wallet,
      isActive: pathname.startsWith('/wallet'),
      badgeContent: `${currentUser.availableCredits}c`,
    },
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: Sparkles,
      isActive: pathname === '/dashboard' || pathname === '/profile' || pathname === '/settings',
    },
  ];

  const guestNavItems: NavItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Sparkles,
      isActive: pathname === '/',
    },
    {
      label: 'Explore',
      href: '/discover',
      icon: Compass,
      isActive: pathname === '/discover',
    },
    {
      label: 'Help',
      href: '/help',
      icon: HelpCircle,
      isActive: pathname === '/help',
    },
    {
      label: 'Sign In',
      href: '/auth/signin',
      icon: LogIn,
      isActive: pathname === '/auth/signin',
    },
  ];

  const items = isAuthenticated ? authNavItems : guestNavItems;

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line md:hidden shadow-float transition-all safe-bottom"
    >
      <div className={`grid h-16 items-center px-1.5 ${items.length === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center h-full min-h-[48px] py-1 px-0.5 rounded-xl transition-all relative select-none touch-target ${
                item.isActive
                  ? 'text-brand font-bold'
                  : 'text-ink-muted hover:text-ink active:scale-95'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform ${item.isActive ? 'scale-110 text-brand stroke-[2.3]' : 'stroke-[1.8]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-surface">
                    {item.badge}
                  </span>
                )}
                {item.badgeContent && !item.isActive && (
                  <span className="hidden sm:inline-block absolute -top-1.5 -right-3 text-[9px] font-bold bg-brand-soft text-brand-deep px-1 rounded-pill border border-brand/20">
                    {item.badgeContent}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${item.isActive ? 'font-bold text-brand' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-brand" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
