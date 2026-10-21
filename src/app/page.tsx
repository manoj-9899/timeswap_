'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Users, 
  BookOpen, 
  HelpCircle, 
  ChevronDown, 
  Star,
  Compass,
  Zap,
  HeartHandshake
} from 'lucide-react';
import { EquilibriumDial } from '../components/EquilibriumDial';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { useTimeSwap } from '../lib/store';
import { SkillCategory } from '../types';

export default function LandingPage() {
  const { members } = useTimeSwap();
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('All');

  const categories: SkillCategory[] = [
    'All',
    'Design & Creative',
    'Code & Technology',
    'Languages & Writing',
    'Crafts & Hands-on',
    'Music & Sound',
    'Wellness & Lifestyle',
  ];

  const filteredMembers = selectedCategory === 'All'
    ? members.slice(0, 6)
    : members.filter(m => m.skillsTeaching.some(s => s.category === selectedCategory)).slice(0, 6);

  const faqs = [
    {
      q: 'Do I have to trade skills directly with the same person?',
      a: 'No! That is the core breakthrough of TimeSwap. If you teach Elena how to code for one hour, you earn one time credit. You can immediately spend that credit to learn conversational Japanese from Kenji, or ceramic pottery from Maya. Our community ledger settles credits globally.'
    },
    {
      q: 'How does the 2-way confirmation work?',
      a: 'When an exchange finishes, both participants submit a confirmation from their session room. The time credit transfer is finalized and deposited into the mentor’s wallet only after both people sign off. If an issue arises, credits remain securely in escrow.'
    },
    {
      q: 'Is there any real money or currency involved?',
      a: 'Never. TimeSwap is strictly a non-monetary community founded on the intrinsic equality of human attention. One hour of an astrophysicist’s time has the exact same value as one hour of an artisan baker’s time: one time credit.'
    },
    {
      q: 'How do session durations convert to credits?',
      a: 'We use a straightforward, predictable conversion: 60 minutes = 1 time credit. All new members receive 3 welcome credits to begin learning immediately before offering their first skill.'
    },
    {
      q: 'What if I am a beginner and don’t know what to teach?',
      a: 'Everyone has a lived experience or skill that someone else is eager to learn: native language practice, home cooking, personal essay editing, travel advice for your home city, gardening tips, or spreadsheet tricks. Curiosity thrives on everyday knowledge.'
    }
  ];

  return (
    <div className="space-y-12 sm:space-y-20 md:space-y-36">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-6 sm:pt-16 sm:pb-16 overflow-hidden">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#E6E7DF_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-left">
              {/* Pill Tag */}
              <div className="inline-flex items-center gap-2 bg-brand-soft/80 border border-brand/20 px-3.5 py-1.5 rounded-pill shadow-xs">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse-subtle" />
                <span className="text-[10px] sm:text-xs font-semibold text-brand-deep tracking-wide uppercase">
                  Peer-to-Peer Reciprocal Exchange
                </span>
              </div>

              {/* Editorial Headline */}
              <h1 className="text-[clamp(1.85rem,5.5vw,3.75rem)] font-extrabold text-ink font-editorial tracking-tight leading-[1.12] sm:leading-[1.08]">
                Your time is worth more when you <span className="text-brand italic font-normal">share it</span>.
              </h1>

              {/* Sub-copy */}
              <p className="text-sm sm:text-lg lg:text-xl text-ink-muted leading-relaxed max-w-xl">
                Teach what you know for one hour to earn one time credit. Spend those credits learning directly from makers, linguists, coders, and artisans. Zero money. Pure community reciprocity.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
                <Button href="/auth/signup" variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" className="w-full sm:w-auto justify-center min-h-[48px]">
                  Start Swapping Free
                </Button>
                <Button href="/discover" variant="secondary" size="lg" icon={<Compass className="w-4 h-4" />} className="w-full sm:w-auto justify-center min-h-[48px]">
                  Explore 120+ Skills
                </Button>
              </div>

              {/* Trust & Proof Indicators */}
              <div className="pt-4 sm:pt-6 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 max-w-lg">
                <div className="flex items-baseline justify-between sm:block border-b sm:border-0 border-line/40 pb-2 sm:pb-0">
                  <div className="text-base sm:text-2xl font-extrabold text-ink font-editorial">1h = 1 Credit</div>
                  <div className="text-xs text-ink-muted mt-0.5 sm:mt-1">Equal human attention</div>
                </div>
                <div className="flex items-baseline justify-between sm:block border-b sm:border-0 border-line/40 pb-2 sm:pb-0">
                  <div className="text-base sm:text-2xl font-extrabold text-brand font-editorial">2-Way Lock</div>
                  <div className="text-xs text-ink-muted mt-0.5 sm:mt-1">Mutual confirmation</div>
                </div>
                <div className="flex items-baseline justify-between sm:block pb-1 sm:pb-0">
                  <div className="text-base sm:text-2xl font-extrabold text-ink font-editorial">$0 Always</div>
                  <div className="text-xs text-ink-muted mt-0.5 sm:mt-1">Non-monetary ledger</div>
                </div>
              </div>
            </div>

            {/* Right Interactive Equilibrium Dial */}
            <div className="lg:col-span-5 relative">
              <EquilibriumDial />
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS (3 CLEAR STEPS) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <Badge variant="brand" size="md">The Mechanics</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
            How TimeSwap Works in Three Steps
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            A frictionless cycle of generosity. Every hour you spend teaching feeds the shared community pool.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-surface rounded-card p-8 border border-line shadow-subtle hover:shadow-elevated transition-all space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-deep font-extrabold text-lg">
              01
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-ink font-editorial">Teach & Earn Time Credits</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                List the craft, language, or technical skill you enjoy sharing. Conduct a 60-minute session over live video and earn 1 time credit.
              </p>
            </div>
            <div className="bg-surface-subtle p-3.5 rounded-xl border border-line text-xs font-semibold text-brand-deep flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand" />
              60 min teaching = +1 credit earned
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-surface rounded-card p-8 border border-line shadow-subtle hover:shadow-elevated transition-all space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-accent-peach border border-[#ECCFC0] flex items-center justify-center text-[#733F23] font-extrabold text-lg">
              02
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-ink font-editorial">Spend With Any Member</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                You do not need to barter directly with the person who learned from you. Spend your earned credits learning from any mentor across the global directory.
              </p>
            </div>
            <div className="bg-surface-subtle p-3.5 rounded-xl border border-line text-xs font-semibold text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-[#733F23]" />
              Multilateral non-barter exchange
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-surface rounded-card p-8 border border-line shadow-subtle hover:shadow-elevated transition-all space-y-5 relative">
            <div className="w-12 h-12 rounded-2xl bg-accent-yellow-light border border-accent-yellow flex items-center justify-center text-[#6E5B10] font-extrabold text-lg">
              03
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-ink font-editorial">Dual Confirmation Release</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Credits remain safely held in escrow until both participants conclude the call and verify completion. Mutual accountability guarantees genuine engagement.
              </p>
            </div>
            <div className="bg-surface-subtle p-3.5 rounded-xl border border-line text-xs font-semibold text-brand-deep flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand" />
              Credits transfer only upon 2-way signoff
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED COMMUNITY MEMBERS & SKILLS */}
      <section id="community" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3 max-w-xl">
            <Badge variant="brand" size="md">Community Directory</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
              Learn From Passionate Practitioners
            </h2>
            <p className="text-base text-ink-muted leading-relaxed">
              Real makers, engineers, linguists, and artisans offering their hours in exchange for your knowledge.
            </p>
          </div>
          <Button href="/discover" variant="secondary" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
            View All 12 Mentors
          </Button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all touch-target min-h-[40px] flex items-center ${
                selectedCategory === cat
                  ? 'bg-brand text-white shadow-subtle'
                  : 'bg-surface border border-line text-ink-muted hover:text-ink hover:border-[#CED4C8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Member Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(member => (
            <Card key={member.id} variant="interactive" className="flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                {/* Member Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar} name={member.name} size="md" verified />
                    <div>
                      <h3 className="font-bold text-sm text-ink group-hover:text-brand transition-colors">
                        {member.name}
                      </h3>
                      <p className="text-xs text-ink-muted">{member.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-brand-deep bg-brand-soft px-2 py-0.5 rounded-pill border border-brand/20">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{member.rating.toFixed(2)}</span>
                  </div>
                </div>

                {/* Headline & Bio */}
                <p className="text-xs font-medium text-ink leading-snug line-clamp-1">
                  {member.headline}
                </p>
                <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {member.bio}
                </p>

                {/* Skills Teaching */}
                <div className="space-y-1.5 pt-2 border-t border-line">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Offering to teach:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.skillsTeaching.map(skill => (
                      <span
                        key={skill.id}
                        className="text-[11px] font-semibold bg-surface-subtle text-ink px-2.5 py-1 rounded-lg border border-line"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Wants to learn */}
                <div className="space-y-1 text-xs text-ink-muted">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                    Curious to learn:
                  </span>
                  <p className="text-xs text-ink font-medium truncate">
                    {member.skillsLearning.join(' • ')}
                  </p>
                </div>
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-ink-muted font-medium">
                  {member.hoursTaught}h taught • {member.reviewCount} reviews
                </span>
                <Button href={`/members/${member.id}`} variant="soft" size="sm">
                  View Profile
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. ANATOMY OF A TIME CREDIT (VISUAL BREAKDOWN) */}
      <section className="bg-surface-subtle border-y border-line py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Badge variant="brand" size="md">The Unit of Exchange</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
                Anatomy of a Time Credit
              </h2>
              <p className="text-base text-ink-muted leading-relaxed">
                Traditional money distorts learning with gatekeeping, paywalls, and speculative value. TimeSwap restores dignity through pure, uninflated human hours.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-deep font-bold text-xs flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">Equal Exchange Rate</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      60 minutes taught = 1 credit. 120 minutes = 2 credits. 180 minutes = 3 credits. Whole-hour exchange only. Zero fractional credits, negotiation, surges, or platform cuts.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-deep font-bold text-xs flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">Zero Financial Friction</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      No credit cards, processing fees, subscriptions, or tipping algorithms. Time credits are non-cash community tokens that cannot be purchased.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-deep font-bold text-xs flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">Protected by 2-Way Verification</h3>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Credits transfer only after mutual participant confirmation. If an exchange does not occur, credits remain unharmed.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Comparison Card */}
            <div className="lg:col-span-6">
              <div className="bg-surface rounded-modal border border-line shadow-elevated p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-line">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Standard Exchange Matrix</span>
                  <span className="text-xs font-semibold text-brand-deep bg-brand-soft px-2.5 py-1 rounded-pill">Community Ledger</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3.5 bg-brand-soft/40 rounded-xl border border-brand/20">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
                        60m
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">Standard Deep Dive (Most Popular)</div>
                        <div className="text-[11px] text-ink-muted">Full lesson, design system workshop, bread baking</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-brand-deep bg-brand-soft px-2.5 py-1 rounded-lg border border-brand/30 shrink-0">
                      1 Credit
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center font-bold text-xs text-brand shrink-0">
                        120m
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">Comprehensive Workshop</div>
                        <div className="text-[11px] text-ink-muted">End-to-end architecture review, live pottery firing, essay editing</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-brand bg-white px-2.5 py-1 rounded-lg border border-line shrink-0">
                      2 Credits
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-line flex items-center justify-center font-bold text-xs text-brand shrink-0">
                        180m
                      </div>
                      <div>
                        <div className="text-xs font-bold text-ink">Intensive Masterclass</div>
                        <div className="text-[11px] text-ink-muted">Complex system design, deep monograph editing, master craftsmanship</div>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-brand bg-white px-2.5 py-1 rounded-lg border border-line shrink-0">
                      3 Credits
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#FAF0E8] rounded-xl border border-[#F2DACB] text-xs text-[#7A4323] leading-relaxed">
                  <strong>Starter Grant:</strong> Every accepted member receives <strong>3 Time Credits</strong> automatically so you can immediately book your first learning sessions without waiting.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRINCIPLES & TRUST */}
      <section id="principles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
          <Badge variant="brand" size="md">Community Charter</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
            Built on Five Core Commitments
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            TimeSwap thrives because every member shares a standard of mutual generosity and respect.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface p-6 rounded-card border border-line space-y-3">
            <HeartHandshake className="w-6 h-6 text-brand" />
            <h3 className="font-bold text-base text-ink font-editorial">Reciprocal Respect</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              We treat the learner and the teacher with equal reverence. There are no hierarchies; everyone is a student in some realm.
            </p>
          </div>

          <div className="bg-surface p-6 rounded-card border border-line space-y-3">
            <Clock className="w-6 h-6 text-brand" />
            <h3 className="font-bold text-base text-ink font-editorial">Radical Punctuality</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Human time is non-renewable. Showing up on time and being fully present during exchanges is our highest currency.
            </p>
          </div>

          <div className="bg-surface p-6 rounded-card border border-line space-y-3">
            <ShieldCheck className="w-6 h-6 text-brand" />
            <h3 className="font-bold text-base text-ink font-editorial">Two-Way Integrity</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              We confirm completion honestly. Honest reviews and prompt signoffs preserve the health of the shared credit pool.
            </p>
          </div>
        </div>
      </section>

      {/* 6. FAQS */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-12">
          <Badge variant="brand" size="md">Got Questions?</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-ink-muted leading-relaxed">
            Everything you need to know about the reciprocal exchange mechanics.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-surface rounded-card border border-line transition-all overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-base text-ink hover:text-brand transition-colors"
                >
                  <span className="font-editorial text-lg">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-ink-muted flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-sm text-ink-muted leading-relaxed border-t border-line/50 mt-1 pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CONVERSION BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-brand-deep text-white rounded-modal p-8 sm:p-14 overflow-hidden shadow-float">
          {/* Subtle daylight orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent-peach/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <Badge variant="brand" size="md" className="bg-white/10 text-white border-white/20">
              Join 1,200+ Mentors
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-extrabold font-editorial tracking-tight leading-tight">
              Begin your first skill exchange today.
            </h2>
            <p className="text-base sm:text-lg text-white/80 leading-relaxed">
              Create your profile in 3 minutes, receive 3 welcome time credits, and start connecting with mentors who care about real craft.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button href="/auth/signup" variant="primary" size="lg" className="w-full sm:w-auto bg-white text-brand-deep hover:bg-canvas justify-center min-h-[48px]">
                Start Swapping Now
              </Button>
              <Button href="/discover" variant="ghost" size="lg" className="w-full sm:w-auto text-white hover:bg-white/10 border border-white/20 justify-center min-h-[48px]">
                Browse Skills First
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
