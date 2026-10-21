'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Clock, 
  ArrowRight, 
  Compass, 
  Calendar, 
  Wallet, 
  MessageSquare, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { CreditPill } from '../../components/ui/CreditPill';

export default function DashboardPage() {
  const { currentUser, sessions, transactions, conversations, members, acceptSession, declineSession } = useTimeSwap();

  const upcomingSessions = sessions.filter(s => s.status === 'upcoming');
  const pendingSessions = sessions.filter(s => s.status === 'pending');
  const pendingConfirmation = sessions.find(s => s.teacherConfirmed !== s.learnerConfirmed && !s.transferFinalized);

  const suggestedMembers = members
    .filter(m => m.id !== currentUser.id)
    .slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-10">
      {/* 1. WELCOME & ACTION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 pb-4 sm:pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-deep">
              Reciprocal Dashboard
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            You have <strong className="text-ink">{currentUser.availableCredits} Time Credits</strong> available to exchange for learning.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full md:w-auto">
          <Link href="/discover" className="w-full sm:w-auto">
            <Button variant="primary" icon={<Compass className="w-4 h-4" />} className="w-full sm:w-auto">
              Discover Skills
            </Button>
          </Link>
          <Link href="/profile" className="w-full sm:w-auto">
            <Button variant="secondary" icon={<Plus className="w-4 h-4" />} className="w-full sm:w-auto">
              Offer a Skill
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. CRITICAL ACTION CALLOUT: PENDING 2-WAY COMPLETION */}
      {pendingConfirmation && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300/60 flex items-center justify-center text-amber-800 flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                  Action Required • Mutual Confirmation
                </span>
                <Badge variant="warning" size="sm">Pending Sign-off</Badge>
              </div>
              <h2 className="text-base font-bold text-ink mt-0.5">
                Confirm completion of &ldquo;{pendingConfirmation.skillTitle}&rdquo;
              </h2>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                {pendingConfirmation.teacherName} marked the session delivered. Confirm to release {pendingConfirmation.creditCost} time credit from escrow.
              </p>
            </div>
          </div>
          <Link href={`/sessions/${pendingConfirmation.id}/complete`} className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full sm:w-auto whitespace-nowrap bg-amber-800 hover:bg-amber-900 text-white">
              Review & Release Credit
            </Button>
          </Link>
        </div>
      )}

      {/* 3. TIME-CREDIT SUMMARY TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Available Balance */}
        <div className="bg-surface rounded-card p-3.5 sm:p-5 border border-line shadow-subtle space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span className="truncate">Available Balance</span>
            <Clock className="w-4 h-4 text-brand flex-shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial">
              {currentUser.availableCredits.toFixed(1)}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-brand-deep">Credits</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-ink-muted leading-tight line-clamp-2">
            Equals {currentUser.availableCredits * 60} minutes of learning time.
          </p>
        </div>

        {/* Hours Taught */}
        <div className="bg-surface rounded-card p-3.5 sm:p-5 border border-line shadow-subtle space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span className="truncate">Hours Taught</span>
            <TrendingUp className="w-4 h-4 text-brand flex-shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial">
              {currentUser.hoursTaught}h
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-ink-muted">shared</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-brand-deep font-medium leading-tight line-clamp-2">
            +{currentUser.lifetimeCreditsEarned.toFixed(1)} credits earned.
          </p>
        </div>

        {/* Hours Learned */}
        <div className="bg-surface rounded-card p-3.5 sm:p-5 border border-line shadow-subtle space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span className="truncate">Hours Learned</span>
            <Sparkles className="w-4 h-4 text-[#7A4323] flex-shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial">
              {currentUser.hoursLearned}h
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-ink-muted">absorbed</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-ink-muted leading-tight line-clamp-2">
            {currentUser.lifetimeCreditsSpent.toFixed(1)} credits spent.
          </p>
        </div>

        {/* Escrow / Pending */}
        <div className="bg-surface-subtle rounded-card p-3.5 sm:p-5 border border-line space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span className="truncate">Escrow</span>
            <CheckCircle2 className="w-4 h-4 text-ink-muted flex-shrink-0" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial">
              {currentUser.pendingCredits.toFixed(1)}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold text-ink-muted">Credits</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-ink-muted leading-tight line-clamp-2">
            Held safely until mutual sign-off.
          </p>
        </div>
      </div>

      {/* 4. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Sessions & Messages */}
        <div className="lg:col-span-8 space-y-8">
          {/* Upcoming Sessions Card */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand" />
                <h2 className="font-bold text-base text-ink font-editorial">Upcoming Sessions</h2>
              </div>
              <Link href="/sessions" className="text-xs text-brand font-semibold hover:underline flex items-center gap-1">
                View all ({sessions.length}) <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-ink-muted space-y-2">
                <p className="text-sm">No scheduled exchanges coming up.</p>
                <Link href="/discover">
                  <Button variant="secondary" size="sm">Browse Mentors</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingSessions.map(session => (
                  <div
                    key={session.id}
                    className="p-4 bg-surface-subtle hover:bg-white rounded-xl border border-line transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar
                        src={session.teacherId === currentUser.id ? session.learnerAvatar : session.teacherAvatar}
                        name={session.teacherId === currentUser.id ? session.learnerName : session.teacherName}
                        size="md"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{session.skillTitle}</span>
                          <CreditPill amount={session.creditCost} type="cost" size="sm" />
                        </div>
                        <p className="text-xs text-ink-muted">
                          With {session.teacherId === currentUser.id ? session.learnerName : session.teacherName} • {session.scheduledDate}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <a
                        href={session.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand text-white hover:bg-brand-deep transition-colors"
                      >
                        Join Room <ExternalLink className="w-3 h-3" />
                      </a>
                      <Link href={`/sessions/${session.id}/complete`}>
                        <Button variant="outline" size="sm">
                          Sign-off
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Inbound / Outbound Requests */}
          {pendingSessions.length > 0 && (
            <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h2 className="font-bold text-base text-ink font-editorial">Pending Requests</h2>
                </div>
                <Badge variant="neutral" size="sm">{pendingSessions.length} Pending</Badge>
              </div>

              <div className="space-y-3">
                {pendingSessions.map(session => {
                  const isTeacher = session.teacherId === currentUser.id;
                  return (
                    <div
                      key={session.id}
                      className="p-4 bg-surface-subtle rounded-xl border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink">{session.skillTitle}</span>
                          <span className="text-[11px] text-ink-muted">({session.durationMinutes}m)</span>
                        </div>
                        <p className="text-xs text-ink-muted">
                          {isTeacher
                            ? `Requested by ${session.learnerName} • Goal: "${session.learningGoal}"`
                            : `Sent to ${session.teacherName} • Awaiting acceptance`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {isTeacher ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => acceptSession(session.id)}
                            >
                              Accept Request
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => declineSession(session.id)}
                            >
                              Decline
                            </Button>
                          </>
                        ) : (
                          <Link href={`/sessions/${session.id}/complete`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Direct Messages Preview */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand" />
                <h2 className="font-bold text-base text-ink font-editorial">Active Conversations</h2>
              </div>
              <Link href="/messages" className="text-xs text-brand font-semibold hover:underline">
                Open Messenger
              </Link>
            </div>

            <div className="divide-y divide-line">
              {conversations.slice(0, 3).map(c => (
                <Link
                  key={c.id}
                  href={`/messages?id=${c.id}`}
                  className="flex items-center justify-between py-3 hover:bg-surface-subtle -mx-2 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={c.participantAvatar} name={c.participantName} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">{c.participantName}</span>
                        {c.unreadCount > 0 && (
                          <span className="w-2 h-2 rounded-full bg-brand" />
                        )}
                      </div>
                      <p className="text-xs text-ink-muted truncate max-w-xs">{c.lastMessage}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-ink-muted">{c.lastMessageTime}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Suggested Mentors & Recent Wallet Activity */}
        <div className="lg:col-span-4 space-y-8">
          {/* Suggested Mentors */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="font-bold text-sm text-ink font-editorial">Suggested Mentors</h2>
              <Link href="/discover" className="text-xs text-brand font-semibold hover:underline">
                Explore All
              </Link>
            </div>

            <div className="space-y-3.5">
              {suggestedMembers.map(m => (
                <div key={m.id} className="p-3 bg-surface-subtle rounded-xl border border-line space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={m.avatar} name={m.name} size="sm" verified />
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-ink truncate">{m.name}</h3>
                      <p className="text-[11px] text-ink-muted truncate">{m.headline}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {m.skillsTeaching.slice(0, 2).map(s => (
                      <span key={s.id} className="text-[10px] bg-white text-ink-muted font-medium px-2 py-0.5 rounded border border-line">
                        {s.name}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[10px] text-ink-muted">{m.hoursTaught}h taught</span>
                    <Link href={`/members/${m.id}`}>
                      <Button variant="soft" size="sm">
                        Request
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Wallet Ledger Activity */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-brand" />
                <h2 className="font-bold text-sm text-ink font-editorial">Recent Credit Ledger</h2>
              </div>
              <Link href="/wallet" className="text-xs text-brand font-semibold hover:underline">
                Full Ledger
              </Link>
            </div>

            <div className="space-y-3">
              {transactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1.5 border-b border-line last:border-0">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-ink block">{tx.skillTitle}</span>
                    <span className="text-[10px] text-ink-muted">{tx.date} • {tx.counterpartyName}</span>
                  </div>
                  <CreditPill
                    amount={tx.amount}
                    type={tx.type === 'earned' || tx.type === 'bonus' ? 'earned' : 'spent'}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
