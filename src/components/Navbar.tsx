'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Clock, 
  Bell, 
  Compass, 
  Calendar, 
  Wallet, 
  MessageSquare, 
  Bookmark, 
  User, 
  Settings, 
  Menu, 
  X, 
  Sparkles,
  ArrowRight,
  LogOut,
  HelpCircle
} from 'lucide-react';
import { useTimeSwap } from '../lib/store';
import { Avatar } from './ui/Avatar';
import { CreditPill } from './ui/CreditPill';
import { Badge } from './ui/Badge';

export function Navbar() {
  const pathname = usePathname();
  const { currentUser, notifications, conversations, markNotificationRead, signOut, isDemoMode } = useTimeSwap();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isPublicPage = pathname === '/' || pathname.startsWith('/auth');

  const unreadNotifs = notifications.filter(n => !n.isRead);
  const totalUnreadMessages = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const appNavLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: Sparkles },
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'My Sessions', href: '/sessions', icon: Calendar },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Messages', href: '/messages', icon: MessageSquare },
  ];

  const publicNavLinks = [
    { label: 'How It Works', href: '/#how-it-works' },
    { label: 'Explore Skills', href: '/discover' },
    { label: 'Community', href: '/#community' },
    { label: 'Principles', href: '/#principles' },
    { label: 'FAQ', href: '/#faq' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-md border-b border-line transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Wordmark & Icon */}
        <div className="flex items-center gap-3">
          <Link 
            href={isPublicPage ? '/' : '/dashboard'} 
            className="flex items-center gap-2.5 group select-none flex-shrink-0"
          >
            {/* Custom Dual Reciprocal Ring Mark */}
            <div className="w-8 h-8 rounded-xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand transition-transform group-hover:scale-105 duration-200">
              <svg className="w-5 h-5 text-brand" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="12" r="5" />
                <circle cx="15" cy="12" r="5" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg text-ink tracking-tight font-editorial leading-none">
                Time<span className="text-brand">Swap</span>
              </span>
              <span className="text-[10px] text-ink-muted uppercase tracking-widest font-semibold leading-none mt-0.5">
                Knowledge Ledger
              </span>
            </div>
          </Link>
          {isDemoMode && (
            <span 
              className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-sand/80 text-ink-muted border border-line"
              title="Supabase credentials not configured in browser environment. Running in offline demo simulation."
            >
              Demo Mode
            </span>
          )}
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {isPublicPage ? (
            publicNavLinks.map(link => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
              >
                {link.label}
              </Link>
            ))
          ) : (
            appNavLinks.map(link => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors relative ${
                    isActive
                      ? 'bg-surface text-brand-deep font-semibold shadow-xs border border-line'
                      : 'text-ink-muted hover:text-ink hover:bg-surface-subtle'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand' : 'opacity-70'}`} />
                  <span>{link.label}</span>
                  {link.label === 'Messages' && totalUnreadMessages > 0 && (
                    <span className="w-2 h-2 rounded-full bg-brand" />
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Right Action Cluster */}
        <div className="flex items-center gap-2.5">
          {isPublicPage ? (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/signin"
                className="text-xs font-semibold px-3 py-2 text-ink hover:text-brand-deep transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="text-xs font-semibold px-4 py-2 bg-brand hover:bg-brand-deep text-white rounded-xl shadow-subtle transition-all duration-200"
              >
                Start Swapping
              </Link>
            </div>
          ) : (
            <>
              {/* Credit Pill Header Widget */}
              <Link href="/wallet" className="group">
                <CreditPill
                  amount={currentUser.availableCredits}
                  type="balance"
                  size="md"
                  className="transition-transform group-hover:scale-105"
                />
              </Link>

              {/* Notifications Popover Toggle */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setUserMenuOpen(false);
                  }}
                  aria-label="View notifications"
                  className="p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-subtle border border-transparent hover:border-line transition-all relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifs.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface rounded-2xl border border-line shadow-float p-4 z-50 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">Notifications</span>
                        {unreadNotifs.length > 0 && (
                          <Badge variant="brand" size="sm">
                            {unreadNotifs.length} new
                          </Badge>
                        )}
                      </div>
                      <Link
                        href="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-brand hover:underline font-semibold"
                      >
                        View all
                      </Link>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {notifications.slice(0, 4).map(n => (
                        <Link
                          key={n.id}
                          href={n.actionUrl}
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                          }}
                          className={`block p-2.5 rounded-xl border transition-all ${
                            n.isRead
                              ? 'bg-transparent border-transparent hover:bg-surface-subtle'
                              : 'bg-brand-soft/40 border-brand/20 hover:bg-brand-soft/70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-semibold text-ink line-clamp-1">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-ink-muted whitespace-nowrap">
                              {n.timestamp}
                            </span>
                          </div>
                          <p className="text-xs text-ink-muted line-clamp-2 mt-0.5 leading-relaxed">
                            {n.body}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar Menu Dropdown */}
              <div className="relative">
                <button
                  aria-label="User account menu"
                  onClick={() => {
                    setUserMenuOpen(!userMenuOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-subtle border border-transparent hover:border-line transition-all"
                >
                  <Avatar src={currentUser.avatar} name={currentUser.name} size="sm" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-surface rounded-2xl border border-line shadow-float p-3 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-2 border-b border-line mb-2">
                      <p className="text-xs font-bold text-ink truncate">{currentUser.name}</p>
                      <p className="text-[11px] text-ink-muted truncate">@{currentUser.handle}</p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-brand-deep font-semibold bg-brand-soft px-2.5 py-1 rounded-lg">
                        <span>Balance</span>
                        <span>{currentUser.availableCredits} Time Credits</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 text-xs font-medium">
                      <Link
                        href="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
                      >
                        <User className="w-4 h-4 text-ink-muted" />
                        <span>My Profile</span>
                      </Link>
                      <Link
                        href="/saved"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
                      >
                        <Bookmark className="w-4 h-4 text-ink-muted" />
                        <span>Saved Mentors</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
                      >
                        <Settings className="w-4 h-4 text-ink-muted" />
                        <span>Settings</span>
                      </Link>
                      <Link
                        href="/help"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 p-2 rounded-lg text-ink hover:bg-surface-subtle transition-colors"
                      >
                        <HelpCircle className="w-4 h-4 text-ink-muted" />
                        <span>Help & FAQs</span>
                      </Link>
                      <div className="pt-1 mt-1 border-t border-line">
                        <button
                          type="button"
                          onClick={async () => {
                            setUserMenuOpen(false);
                            await signOut();
                          }}
                          className="w-full flex items-center gap-2.5 p-2 rounded-lg text-status-error hover:bg-red-50 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-xl text-ink-muted hover:text-ink hover:bg-surface-subtle transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-b border-line px-4 pt-2 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            {(isPublicPage ? publicNavLinks : appNavLinks).map(link => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-ink hover:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{link.label}</span>
                  {link.label === 'Messages' && totalUnreadMessages > 0 && (
                    <Badge variant="brand" size="sm">
                      {totalUnreadMessages}
                    </Badge>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-ink-muted" />
              </Link>
            ))}
          </div>

          {!isPublicPage && (
            <div className="pt-3 border-t border-line space-y-2">
              <div className="flex items-center justify-between px-3 py-2 bg-surface-subtle rounded-xl text-xs font-semibold">
                <span className="text-ink-muted">Time-Credit Balance</span>
                <CreditPill amount={currentUser.availableCredits} type="balance" size="sm" />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 text-center bg-surface border border-line rounded-xl text-ink"
                >
                  My Profile
                </Link>
                <Link
                  href="/wallet"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 text-center bg-surface border border-line rounded-xl text-ink"
                >
                  My Wallet
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
