'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Bookmark, 
  Star, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles,
  AlertCircle,
  MapPin,
  Globe
} from 'lucide-react';
import { useTimeSwap } from '../../../lib/store';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';
import { CreditPill } from '../../../components/ui/CreditPill';
import { SUPPORTED_SESSION_DURATIONS, calculateCreditCost } from '../../../lib/domain/duration';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { Select } from '../../../components/ui/Select';
import { SessionDuration, SkillItem } from '../../../types';

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params?.id as string;
  const { members, currentUser, toggleSaveMember, requestSession, createConversationWithMember } = useTimeSwap();

  const member = members.find(m => m.id === memberId);

  // Session Request Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [learningGoal, setLearningGoal] = useState('');
  const [duration, setDuration] = useState<SessionDuration>(60);
  const [date, setDate] = useState('Tomorrow');
  const [time, setTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!member) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-ink">Member Not Found</h1>
        <p className="text-sm text-ink-muted">This mentor does not exist or has departed the exchange circle.</p>
        <Link href="/discover">
          <Button variant="primary">Return to Directory</Button>
        </Link>
      </div>
    );
  }

  const creditCost = calculateCreditCost(duration);
  const hasEnoughCredit = currentUser.availableCredits >= creditCost;

  const handleOpenBooking = (skill?: SkillItem) => {
    setSelectedSkill(skill || member.skillsTeaching[0]);
    setRequestError('');
    setModalOpen(true);
  };

  const handleStartMessage = async () => {
    const convId = await createConversationWithMember(member.id);
    router.push(`/messages?id=${convId}`);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkill) return;

    if (currentUser.onboardingCompleted === false) {
      setRequestError('Essential setup required: Please complete your mentor profile onboarding before requesting a skill exchange.');
      return;
    }

    if (!hasEnoughCredit) {
      setRequestError(`You need ${creditCost} credit(s), but only have ${currentUser.availableCredits} in your wallet.`);
      return;
    }

    setIsSubmitting(true);
    setRequestError('');
    const res = await requestSession({
      teacherId: member.id,
      skillTitle: selectedSkill.name,
      category: selectedSkill.category,
      learningGoal: learningGoal.trim() || 'Deep dive into ' + selectedSkill.name,
      durationMinutes: duration,
      scheduledDate: `${date} at ${time}`,
      scheduledTime: `${time} (${member.timezone})`,
      messageNotes: notes.trim(),
    });

    setIsSubmitting(false);
    if (res.success) {
      setModalOpen(false);
      router.push('/sessions');
    } else {
      setRequestError(res.error || 'Failed to submit request');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Link */}
      <Link
        href="/discover"
        className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink font-semibold transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Discover
      </Link>

      {/* Main Profile Header Card */}
      <div className="bg-surface rounded-modal border border-line shadow-elevated p-4 sm:p-10 space-y-5 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 sm:gap-6 pb-5 sm:pb-6 border-b border-line">
          <div className="flex items-start gap-3.5 sm:gap-5">
            <Avatar src={member.avatar} name={member.name} size="lg" className="sm:hidden flex-shrink-0" verified />
            <Avatar src={member.avatar} name={member.name} size="xl" className="hidden sm:inline-flex flex-shrink-0" verified />
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight truncate">
                  {member.name}
                </h1>
                <div className="flex items-center gap-1 text-xs font-bold text-brand-deep bg-brand-soft px-2.5 py-0.5 rounded-pill border border-brand/20">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{member.rating.toFixed(2)}</span>
                  <span className="opacity-60">({member.reviewCount})</span>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-ink leading-snug">
                {member.headline}
              </p>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-ink-muted pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand" /> {member.location}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-brand" /> {member.timezone}
                </span>
                <span className="hidden xs:inline">•</span>
                <span className="hidden xs:inline">Joined {member.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-5 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            <button
              aria-label={member.isSaved ? `Remove ${member.name} from bookmarks` : `Bookmark ${member.name}`}
              onClick={() => toggleSaveMember(member.id)}
              className={`col-span-1 p-2 sm:p-2.5 rounded-xl border transition-colors flex items-center justify-center touch-target ${
                member.isSaved
                  ? 'bg-brand-soft text-brand-deep border-brand/30'
                  : 'bg-surface text-ink-muted border-line hover:text-ink'
              }`}
              title={member.isSaved ? 'Bookmarked' : 'Bookmark mentor'}
            >
              <Bookmark className={`w-4 h-4 ${member.isSaved ? 'fill-current' : ''}`} />
            </button>

            <Button
              variant="secondary"
              onClick={handleStartMessage}
              icon={<MessageSquare className="w-4 h-4" />}
              className="col-span-2 sm:col-auto"
            >
              Message
            </Button>

            <Button
              variant="primary"
              onClick={() => handleOpenBooking()}
              icon={<Sparkles className="w-4 h-4" />}
              className="col-span-2 sm:col-auto"
            >
              <span className="sm:hidden">Request</span>
              <span className="hidden sm:inline">Request Exchange</span>
            </Button>
          </div>
        </div>

        {/* Bio & Badges */}
        <div className="space-y-4">
          <p className="text-sm text-ink leading-relaxed max-w-3xl">
            {member.bio}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {member.badges.map(b => (
              <Badge key={b} variant="brand" size="md">
                {b}
              </Badge>
            ))}
            <span className="text-xs text-ink-muted ml-2">
              <strong className="text-ink">{member.hoursTaught}h</strong> taught • <strong className="text-ink">{member.hoursLearned}h</strong> learned
            </span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Skills & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Teaching Curriculum & Reviews */}
        <div className="lg:col-span-8 space-y-8">
          {/* Skills Offered For Exchange */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="font-bold text-base text-ink font-editorial">
                Skills Offered for Exchange
              </h2>
              <span className="text-xs text-brand-deep font-semibold bg-brand-soft px-2.5 py-1 rounded-pill">
                1 Hour = 1 Credit
              </span>
            </div>

            <div className="space-y-4">
              {member.skillsTeaching.map(skill => (
                <div
                  key={skill.id}
                  className="p-5 rounded-2xl bg-surface-subtle border border-line space-y-3 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-base text-ink">{skill.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge variant="neutral" size="sm">{skill.category}</Badge>
                        <Badge variant="brand" size="sm">{skill.proficiency}</Badge>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenBooking(skill)}
                      className="w-full sm:w-auto"
                    >
                      Book This Skill
                    </Button>
                  </div>

                  <p className="text-xs text-ink-muted leading-relaxed">
                    {skill.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Member Reviews */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-ink font-editorial">Exchanges & Feedback</h2>
                <Badge variant="neutral" size="sm">{member.reviews.length}</Badge>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-brand-deep">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{member.rating.toFixed(2)} average satisfaction</span>
              </div>
            </div>

            {member.reviews.length === 0 ? (
              <p className="text-xs text-ink-muted py-4 italic">No public reviews written yet.</p>
            ) : (
              <div className="space-y-4">
                {member.reviews.map(rev => (
                  <div key={rev.id} className="p-4 bg-surface-subtle rounded-xl border border-line space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar src={rev.authorAvatar} name={rev.authorName} size="sm" />
                        <div>
                          <span className="text-xs font-bold text-ink block">{rev.authorName}</span>
                          <span className="text-[10px] text-ink-muted">{rev.date} • {rev.skillSwapped} ({rev.duration})</span>
                        </div>
                      </div>
                      <div className="flex text-amber-500">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Learning Wishlist & Availability */}
        <div className="lg:col-span-4 space-y-8">
          {/* Availability Card */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <Calendar className="w-4 h-4 text-brand" />
              <h2 className="font-bold text-sm text-ink font-editorial">Availability & Schedule</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block mb-1">
                  Available Days:
                </span>
                <div className="flex flex-wrap gap-1">
                  {member.availability.days.map(d => (
                    <span key={d} className="bg-surface-subtle text-ink font-semibold px-2 py-0.5 rounded border border-line">
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                  Typical Hours:
                </span>
                <p className="text-ink font-medium mt-0.5">{member.availability.timeSlot}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                  Exchange Cadence:
                </span>
                <p className="text-ink font-medium mt-0.5">{member.availability.preferredCadence}</p>
              </div>
            </div>
          </div>

          {/* Learning Interests Card */}
          <div className="bg-surface rounded-card p-6 border border-line shadow-subtle space-y-4">
            <h2 className="font-bold text-sm text-ink font-editorial pb-3 border-b border-line">
              Curious to Learn
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              {member.name} spends their earned time credits on:
            </p>
            <div className="space-y-2">
              {member.skillsLearning.map(skill => (
                <div
                  key={skill}
                  className="p-2.5 bg-surface-subtle rounded-xl border border-line text-xs font-semibold text-ink flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#733F23]" />
                  <span>{skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reciprocal Safety Box */}
          <div className="p-4 bg-brand-soft/60 rounded-xl border border-brand/20 text-xs text-brand-deep space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck className="w-4 h-4 text-brand" />
              Two-Way Protected
            </div>
            <p className="text-[11px]">
              When you book a session with {member.name}, your credit is placed in mutual escrow and only finalized after both of you confirm the call has taken place.
            </p>
          </div>
        </div>
      </div>

      {/* SESSION REQUEST MODAL */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Request Exchange with ${member.name}`}
        description="Select the topic, duration, and goal for your 1-on-1 session."
        maxWidth="lg"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4 mt-2">
          {requestError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-status-error flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{requestError}</span>
            </div>
          )}

          {/* Topic selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Teaching Topic
            </label>
            <div className="space-y-2">
              {member.skillsTeaching.map(skill => (
                <label
                  key={skill.id}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedSkill?.id === skill.id
                      ? 'bg-brand-soft border-brand/40 text-brand-deep shadow-2xs'
                      : 'bg-surface-subtle border-line text-ink hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="selectedSkill"
                      checked={selectedSkill?.id === skill.id}
                      onChange={() => setSelectedSkill(skill)}
                      className="text-brand focus:ring-brand"
                    />
                    <span className="text-xs font-bold">{skill.name}</span>
                  </div>
                  <Badge variant="neutral" size="sm">{skill.proficiency}</Badge>
                </label>
              ))}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Exchange Duration & Credit Cost
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_SESSION_DURATIONS.map(d => {
                const cost = calculateCreditCost(d);
                const isSelected = duration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-surface-subtle border-line text-ink hover:bg-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{d} Minutes</div>
                    <div className={`text-[11px] font-semibold mt-0.5 ${isSelected ? 'text-white/90' : 'text-brand'}`}>
                      {cost} {cost === 1 ? 'Credit' : 'Credits'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Proposed Day"
              value={date}
              onChange={e => setDate(e.target.value)}
              placeholder="e.g. Tomorrow or Thursday"
              required
            />
            <Input
              label={`Time (${member.timezone})`}
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="e.g. 17:00"
              required
            />
          </div>

          {/* Learning Goal */}
          <Input
            label="What is your learning goal?"
            value={learningGoal}
            onChange={e => setLearningGoal(e.target.value)}
            placeholder="e.g. I want to audit our design tokens and learn modular scaling"
            required
          />

          {/* Note */}
          <Textarea
            label="Message / Context for Mentor"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Share any links or questions ahead of time..."
            rows={2}
          />

          {/* Wallet Balance Summary */}
          <div className="p-3.5 bg-surface-subtle rounded-xl border border-line flex items-center justify-between text-xs">
            <div>
              <span className="text-ink-muted block">Your Wallet Balance:</span>
              <span className="font-bold text-ink">{currentUser.availableCredits} Time Credits</span>
            </div>
            <div className="text-right">
              <span className="text-ink-muted block">Session Cost:</span>
              <span className={`font-extrabold ${hasEnoughCredit ? 'text-brand' : 'text-status-error'}`}>
                {creditCost} Credit
              </span>
            </div>
          </div>

          {!hasEnoughCredit && (
            <p className="text-xs text-status-error">
              You do not have enough credits for this session. Offer a skill to earn more credits first!
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <Button variant="outline" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!hasEnoughCredit}
              loading={isSubmitting}
            >
              Submit Exchange Request ({creditCost} Credit)
            </Button>
          </div>
        </form>
      </Modal>
      {/* Mobile Sticky Booking Bar */}
      <aside
        aria-label="Mobile quick book action"
        className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-line px-4 py-2.5 shadow-float flex items-center justify-between gap-3"
      >
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] uppercase tracking-wider font-bold text-ink-muted">Ready to learn?</span>
          <span className="text-xs font-bold text-ink truncate">
            {selectedSkill?.name || member.skillsTeaching[0]?.name || 'Skill Exchange'}
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => handleOpenBooking()}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          className="whitespace-nowrap flex-shrink-0"
        >
          Request Exchange
        </Button>
      </aside>
    </div>
  );
}
