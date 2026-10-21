'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Bell, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  MessageSquare, 
  ArrowRight,
  Check,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useTimeSwap();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Sparkles className="w-5 h-5 text-brand" />;
      case 'completion_pending':
        return <ShieldCheck className="w-5 h-5 text-amber-600" />;
      case 'session_request':
        return <Clock className="w-5 h-5 text-brand" />;
      case 'credit_transfer':
        return <CheckCircle2 className="w-5 h-5 text-brand-deep" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-ink-muted" />;
      case 'session_declined':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'session_cancelled':
        return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'dispute_flagged':
        return <ShieldAlert className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-ink-muted" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-brand" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-deep">
              Updates & Alerts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            Stay informed on exchange requests, confirmations, and credit balance changes.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllNotificationsRead}
            icon={<Check className="w-3.5 h-3.5" />}
            className="w-full sm:w-auto"
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="bg-surface rounded-modal border border-line shadow-elevated divide-y divide-line overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-ink-muted">
            No notifications recorded.
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`p-5 flex items-start justify-between gap-4 transition-colors ${
                n.isRead ? 'bg-surface hover:bg-surface-subtle/40' : 'bg-brand-soft/30 hover:bg-brand-soft/50'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-surface border border-line shadow-2xs flex-shrink-0 mt-0.5">
                  {getIcon(n.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-ink">{n.title}</h2>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-brand" />
                    )}
                    {n.creditImpact !== undefined && (
                      <Badge variant={n.creditImpact > 0 ? 'success' : 'peach'} size="sm">
                        {n.creditImpact > 0 ? `+${n.creditImpact}` : n.creditImpact} Credit
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-ink-muted leading-relaxed max-w-xl">
                    {n.body}
                  </p>
                  <span className="text-[10px] text-ink-muted block pt-1">
                    {n.timestamp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={n.actionUrl} onClick={() => markNotificationRead(n.id)}>
                  <Button variant="soft" size="sm" icon={<ArrowRight className="w-3 h-3" />} iconPosition="right">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
