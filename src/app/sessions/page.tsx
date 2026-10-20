'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  ShieldCheck, 
  MessageSquare,
  ArrowRight
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { CreditPill } from '../../components/ui/CreditPill';
import { Modal } from '../../components/ui/Modal';
import { Session } from '../../types';

export default function SessionsPage() {
  const { sessions, currentUser, acceptSession, declineSession, cancelSession } = useTimeSwap();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'pending' | 'completed' | 'cancelled'>('upcoming');
  const [cancelModalSession, setCancelModalSession] = useState<Session | null>(null);

  const upcoming = sessions.filter(s => s.status === 'upcoming');
  const pending = sessions.filter(s => s.status === 'pending');
  const completed = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');

  const filtered = activeTab === 'upcoming' 
    ? upcoming 
    : activeTab === 'pending' 
    ? pending 
    : activeTab === 'completed' 
    ? completed 
    : cancelled;

  const handleConfirmCancel = () => {
    if (cancelModalSession) {
      cancelSession(cancelModalSession.id);
      setCancelModalSession(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Exchange Management
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink font-editorial tracking-tight">
            My Exchanges & Sessions
          </h1>
          <p className="text-sm text-ink-muted">
            Track scheduled mentorships, pending requests, and finalize two-way credit transfers.
          </p>
        </div>

        <Link href="/discover">
          <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
            Request New Exchange
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={id => setActiveTab(id as any)}
        tabs={[
          { id: 'upcoming', label: 'Upcoming', badge: upcoming.length },
          { id: 'pending', label: 'Pending Action', badge: pending.length },
          { id: 'completed', label: 'Completed & Verified', badge: completed.length },
          { id: 'cancelled', label: 'Cancelled', badge: cancelled.length },
        ]}
      />

      {/* Session list */}
      {filtered.length === 0 ? (
        <div className="bg-surface rounded-modal border border-line p-12 text-center space-y-3 max-w-md mx-auto my-12">
          <Calendar className="w-8 h-8 text-ink-muted mx-auto" />
          <h3 className="font-bold text-base text-ink font-editorial">No {activeTab} exchanges</h3>
          <p className="text-xs text-ink-muted">
            {activeTab === 'upcoming' && 'You have no confirmed sessions scheduled on your calendar.'}
            {activeTab === 'pending' && 'You have no pending requests or completions awaiting sign-off.'}
            {activeTab === 'completed' && 'Completed exchanges will appear here with mutual confirmation logs.'}
            {activeTab === 'cancelled' && 'No cancelled exchanges.'}
          </p>
          <Link href="/discover">
            <Button variant="secondary" size="sm">
              Discover Mentors
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(session => {
            const isCurrentUserTeacher = session.teacherId === currentUser.id;
            const counterpartyName = isCurrentUserTeacher ? session.learnerName : session.teacherName;
            const counterpartyAvatar = isCurrentUserTeacher ? session.learnerAvatar : session.teacherAvatar;
            const roleLabel = isCurrentUserTeacher ? 'Teaching' : 'Learning';

            return (
              <div
                key={session.id}
                className="bg-surface rounded-card p-6 border border-line shadow-subtle hover:shadow-elevated transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Details */}
                <div className="flex items-start gap-4">
                  <Avatar src={counterpartyAvatar} name={counterpartyName} size="lg" />
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-ink">{session.skillTitle}</span>
                      <CreditPill amount={session.creditCost} type="cost" size="sm" />
                      <Badge
                        variant={
                          session.status === 'accepted' || session.status === 'upcoming' || session.status === 'in_progress'
                            ? 'success'
                            : session.status === 'requested' || session.status === 'pending' || session.status === 'awaiting_completion'
                            ? 'warning'
                            : session.status === 'completed'
                            ? 'brand'
                            : session.status === 'under_review'
                            ? 'peach'
                            : 'error'
                        }
                        size="sm"
                      >
                        {session.status.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="neutral" size="sm">{roleLabel}</Badge>
                    </div>

                    <p className="text-xs text-ink-muted">
                      With <strong className="text-ink">{counterpartyName}</strong> • {session.scheduledDate}
                    </p>

                    <p className="text-xs text-ink-muted italic">
                      Goal: &ldquo;{session.learningGoal}&rdquo;
                    </p>

                    {/* 2-Way Confirmation Status Indicator */}
                    <div className="flex items-center gap-4 text-[11px] pt-1">
                      <span className="flex items-center gap-1">
                        Teacher: {session.teacherConfirmed ? (
                          <span className="text-brand font-semibold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Signed off</span>
                        ) : (
                          <span className="text-ink-muted font-medium">Pending</span>
                        )}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        Learner: {session.learnerConfirmed ? (
                          <span className="text-brand font-semibold flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Signed off</span>
                        ) : (
                          <span className="text-ink-muted font-medium">Pending</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex flex-wrap items-center gap-2.5 self-end lg:self-center">
                  {/* Join room if accepted/upcoming/in_progress */}
                  {(session.status === 'accepted' || session.status === 'upcoming' || session.status === 'in_progress') && (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-brand text-white hover:bg-brand-deep transition-colors shadow-subtle"
                    >
                      Join Call <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {/* Pending request actions for teacher */}
                  {(session.status === 'requested' || session.status === 'pending') && isCurrentUserTeacher && !session.teacherConfirmed && !session.learnerConfirmed && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => acceptSession(session.id)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => declineSession(session.id)}
                      >
                        Decline
                      </Button>
                    </>
                  )}

                  {/* Completion room link */}
                  {session.status !== 'declined' && session.status !== 'expired' && !session.status.startsWith('cancelled') && (
                    <Link href={`/sessions/${session.id}/complete`}>
                      <Button
                        variant={session.status === 'awaiting_completion' || (session.status === 'pending' && (session.teacherConfirmed || session.learnerConfirmed)) ? 'primary' : 'secondary'}
                        size="sm"
                        icon={<ShieldCheck className="w-3.5 h-3.5" />}
                      >
                        {session.status === 'completed' ? 'View Certificate' : 'Completion Room'}
                      </Button>
                    </Link>
                  )}

                  {/* Cancel button if active */}
                  {(session.status === 'requested' || session.status === 'accepted' || session.status === 'upcoming' || session.status === 'in_progress') && (
                    <button
                      aria-label="Cancel this scheduled session"
                      onClick={() => setCancelModalSession(session)}
                      className="text-xs text-status-error hover:underline px-2 py-1 font-medium"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      <Modal
        isOpen={Boolean(cancelModalSession)}
        onClose={() => setCancelModalSession(null)}
        title="Cancel Scheduled Exchange?"
        description="Are you certain you want to cancel this session? Any credits in escrow will be immediately returned to the learner."
        maxWidth="md"
      >
        <div className="space-y-4 mt-2">
          {cancelModalSession && (
            <div className="p-3 bg-surface-subtle rounded-xl border border-line text-xs">
              <span className="font-bold text-ink block">{cancelModalSession.skillTitle}</span>
              <span className="text-ink-muted">{cancelModalSession.scheduledDate}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button variant="outline" onClick={() => setCancelModalSession(null)}>
              Keep Session
            </Button>
            <Button variant="danger" onClick={handleConfirmCancel}>
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
