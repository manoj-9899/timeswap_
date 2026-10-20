'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  ArrowRight,
  UserCheck,
  Check,
  RotateCcw
} from 'lucide-react';
import { useTimeSwap } from '../../../../lib/store';
import { Button } from '../../../../components/ui/Button';
import { Badge } from '../../../../components/ui/Badge';
import { Avatar } from '../../../../components/ui/Avatar';
import { Card } from '../../../../components/ui/Card';
import { CreditPill } from '../../../../components/ui/CreditPill';

export default function SessionCompletionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.id as string;
  const { sessions, currentUser, confirmCompletion } = useTimeSwap();

  const [loadingAction, setLoadingAction] = useState(false);
  const [successNote, setSuccessNote] = useState('');

  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-ink">Session Not Found</h1>
        <Link href="/sessions">
          <Button variant="primary">Return to Sessions</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUserTeacher = session.teacherId === currentUser.id;
  const isCurrentUserLearner = session.learnerId === currentUser.id;
  const currentRole = isCurrentUserTeacher ? 'teacher' : 'learner';
  const partnerRole = isCurrentUserTeacher ? 'learner' : 'teacher';

  const myConfirmed = isCurrentUserTeacher ? session.teacherConfirmed : session.learnerConfirmed;
  const partnerConfirmed = isCurrentUserTeacher ? session.learnerConfirmed : session.teacherConfirmed;
  const partnerName = isCurrentUserTeacher ? session.learnerName : session.teacherName;

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#347A5C', '#255640', '#F2E7BE', '#F5E2D4']
      });
    } catch (e) {
      // safe fallback
    }
  };

  const handleMyConfirm = async () => {
    setLoadingAction(true);
    try {
      const res = await confirmCompletion(session.id, currentRole);
      setLoadingAction(false);
      if (res.bothConfirmed) {
        triggerCelebration();
        setSuccessNote(`Both participants have confirmed! ${session.creditCost} Time Credit transfer has been finalized.`);
      } else if (res.success) {
        setSuccessNote('Your confirmation has been saved. Waiting for ' + partnerName + ' to confirm.');
      } else {
        setSuccessNote(res.error || 'Failed to record confirmation.');
      }
    } catch (err: any) {
      setLoadingAction(false);
      setSuccessNote(err.message || 'Error recording confirmation.');
    }
  };

  const handlePartnerSimulateConfirm = async () => {
    setLoadingAction(true);
    try {
      const res = await confirmCompletion(session.id, partnerRole);
      setLoadingAction(false);
      if (res.bothConfirmed) {
        triggerCelebration();
        setSuccessNote(`Both participants have confirmed! ${session.creditCost} Time Credit transfer has been finalized.`);
      } else if (res.success) {
        setSuccessNote(`${partnerName}'s confirmation was recorded in demo state.`);
      } else {
        setSuccessNote(res.error || 'Failed to record demo confirmation.');
      }
    } catch (err: any) {
      setLoadingAction(false);
      setSuccessNote(err.message || 'Error recording demo confirmation.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <Link
        href="/sessions"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-semibold"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to My Exchanges
      </Link>

      {/* Main Verification Card */}
      <div className="bg-surface rounded-modal border border-line shadow-elevated p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2 pb-6 border-b border-line">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
            <ShieldCheck className="w-8 h-8 animate-pulse-subtle" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
            Mutual Session Verification
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
            Credits transfer from escrow <strong className="text-ink">only after both participants</strong> confirm that the learning session was completed.
          </p>
        </div>

        {/* Success feedback toast */}
        {successNote && (
          <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep font-semibold flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-brand flex-shrink-0" />
            <span>{successNote}</span>
          </div>
        )}

        {/* Exchange Details Strip */}
        <div className="p-5 bg-surface-subtle rounded-2xl border border-line space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                Session Topic
              </span>
              <h2 className="text-base font-bold text-ink">{session.skillTitle}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="md">{session.durationMinutes} Minutes</Badge>
              <CreditPill amount={session.creditCost} type="cost" size="md" />
            </div>
          </div>

          <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                Teacher (Recipient):
              </span>
              <div className="flex items-center gap-2">
                <Avatar src={session.teacherAvatar} name={session.teacherName} size="sm" />
                <span className="font-semibold text-ink">{session.teacherName}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                Learner (Contributor):
              </span>
              <div className="flex items-center gap-2">
                <Avatar src={session.learnerAvatar} name={session.learnerName} size="sm" />
                <span className="font-semibold text-ink">{session.learnerName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* DUAL CONFIRMATION MATRIX */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">
              Participant Confirmation Status
            </h3>
            <span className="text-xs text-ink-muted">
              {session.transferFinalized ? 'Escrow Finalized' : 'Held in Escrow'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Teacher */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                session.teacherConfirmed
                  ? 'bg-brand-soft/70 border-brand/30 text-brand-deep'
                  : 'bg-surface-subtle border-line text-ink-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink">
                  Teacher: {session.teacherName}
                </span>
                {session.teacherConfirmed ? (
                  <Badge variant="brand" size="sm" icon={<Check className="w-3 h-3" />}>
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Awaiting
                  </Badge>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {session.teacherConfirmed
                  ? 'Sign-off complete. Verified that the exchange was held.'
                  : 'Has not yet confirmed completion.'}
              </p>
            </div>

            {/* Box 2: Learner */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                session.learnerConfirmed
                  ? 'bg-brand-soft/70 border-brand/30 text-brand-deep'
                  : 'bg-surface-subtle border-line text-ink-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-ink">
                  Learner: {session.learnerName}
                </span>
                {session.learnerConfirmed ? (
                  <Badge variant="brand" size="sm" icon={<Check className="w-3 h-3" />}>
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Awaiting
                  </Badge>
                )}
              </div>
              <p className="text-[11px] leading-relaxed">
                {session.learnerConfirmed
                  ? 'Sign-off complete. Verified that the skill was received.'
                  : 'Has not yet confirmed completion.'}
              </p>
            </div>
          </div>
        </div>

        {/* FINAL STATUS OR ACTION CONTROLS */}
        <div className="pt-4 border-t border-line space-y-4">
          {session.transferFinalized ? (
            <div className="p-6 bg-brand-soft border border-brand/20 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-brand mx-auto" />
              <div className="space-y-1">
                <h3 className="font-extrabold text-lg text-brand-deep font-editorial">
                  Credit Transfer Finalized & Verified!
                </h3>
                <p className="text-xs text-brand-deep/80 max-w-md mx-auto leading-relaxed">
                  Both participants completed their sign-off. {session.creditCost} time credit has been officially transferred to {session.teacherName}&apos;s wallet. Duplicate transfers are locked.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link href="/wallet">
                  <Button variant="primary" size="sm">
                    View in Wallet Ledger
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" size="sm">
                    Return to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-surface-subtle rounded-xl border border-line">
                <div>
                  <span className="text-xs font-bold text-ink block">
                    Your Sign-off ({isCurrentUserTeacher ? 'As Teacher' : 'As Learner'}):
                  </span>
                  <p className="text-[11px] text-ink-muted">
                    {myConfirmed
                      ? 'You have already confirmed this session.'
                      : 'Submit your confirmation once the session call has ended.'}
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={handleMyConfirm}
                  disabled={myConfirmed}
                  loading={loadingAction}
                  icon={<Check className="w-4 h-4" />}
                >
                  {myConfirmed ? 'Sign-off Recorded' : 'Confirm Completion'}
                </Button>
              </div>

              {/* DEMO TOOL: Simulate partner confirmation */}
              <div className="p-4 bg-accent-peach/30 rounded-xl border border-[#EDD5C5] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-[#733F23] block">
                    Demo Control • Simulate {partnerName}&apos;s Sign-off
                  </span>
                  <p className="text-[11px] text-[#733F23]/80">
                    Test the complete two-way handshake without switching accounts.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePartnerSimulateConfirm}
                  disabled={partnerConfirmed}
                  className="bg-white border-[#ECCFC0] text-[#733F23] hover:bg-white/80"
                >
                  {partnerConfirmed ? `${partnerName} Confirmed` : `Simulate ${partnerName} Confirm`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
