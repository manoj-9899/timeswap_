'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  HelpCircle, 
  Search, 
  ShieldCheck, 
  Clock, 
  Users, 
  ChevronDown, 
  MessageSquare,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [supportSent, setSupportSent] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');

  const helpTopics = [
    {
      q: 'How does the TimeSwap credit economy work?',
      a: 'TimeSwap operates on an atomic reciprocity model: 1 hour of teaching earns 1 time credit. You can spend that credit learning from any other community member. There is no direct barter bottleneck (if you teach Alex, you do not have to learn from Alex; you can learn from Kenji or Maya).',
      cat: 'Credits'
    },
    {
      q: 'When are time credits transferred?',
      a: 'Credits are transferred only after both participants confirm the session took place. After your video call ends, both the teacher and learner enter the session completion room and submit their sign-off. As soon as both have signed, the credit moves from escrow directly into the teacher’s wallet.',
      cat: 'Sessions'
    },
    {
      q: 'What if a participant misses a call or arrives late?',
      a: 'If a participant fails to attend or cancels before mutual sign-off, the credit is returned safely to the learner’s wallet. The 2-way lock ensures that unfulfilled sessions never deduct credits permanently.',
      cat: 'Trust'
    },
    {
      q: 'How are sessions conducted?',
      a: 'Each scheduled exchange automatically generates a dedicated TimeSwap video room link. Participants join via their browser at the scheduled time. No third-party downloads are mandatory.',
      cat: 'Sessions'
    },
    {
      q: 'Can I purchase additional time credits with cash?',
      a: 'No. To protect the egalitarian community ethos, credits cannot be purchased with fiat money, cryptocurrency, or gift cards. The only way to earn time credits is to generously share your skills with fellow humans.',
      cat: 'Credits'
    },
    {
      q: 'What skills are eligible for exchange?',
      a: 'Any positive human skill: programming, language conversation, graphic design, bread baking, musical instruments, vocal technique, creative writing, gardening, breathwork, photography, pottery, or business planning. We strictly prohibit commercial solicitation or unsafe activities.',
      cat: 'Community'
    }
  ];

  const filteredFaqs = helpTopics.filter(f =>
    f.q.toLowerCase().includes(query.toLowerCase()) ||
    f.a.toLowerCase().includes(query.toLowerCase()) ||
    f.cat.toLowerCase().includes(query.toLowerCase())
  );

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMessage.trim()) return;
    setSupportSent(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
          <HelpCircle className="w-6 h-6 text-brand" />
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
          Help Center & Reciprocal Guidelines
        </h1>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          Search answers about the credit escrow, two-way confirmation protocol, and community standards.
        </p>

        <div className="pt-2 max-w-md mx-auto">
          <Input
            placeholder="Search questions (e.g. escrow, credits, no-shows)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Quick Topic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-surface rounded-card border border-line shadow-subtle space-y-2">
          <Clock className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-ink">Time Credit Math</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            1 hour = 1 credit. Predictable, non-monetary, with 3 welcome credits for all new members.
          </p>
        </div>

        <div className="p-5 bg-surface rounded-card border border-line shadow-subtle space-y-2">
          <ShieldCheck className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-ink">2-Way Confirmation</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Credits stay locked in escrow until both participants submit verification.
          </p>
        </div>

        <div className="p-5 bg-surface rounded-card border border-line shadow-subtle space-y-2">
          <Users className="w-5 h-5 text-brand" />
          <h2 className="text-sm font-bold text-ink">Multilateral Barter</h2>
          <p className="text-xs text-ink-muted leading-relaxed">
            Teach one member, spend with anyone else across our 120+ categories.
          </p>
        </div>
      </div>

      {/* FAQs List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-ink font-editorial pb-2 border-b border-line">
          Common Questions ({filteredFaqs.length})
        </h2>

        <div className="space-y-3">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-surface rounded-card border border-line transition-all overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-ink hover:text-brand transition-colors"
                >
                  <span className="font-editorial text-base">{faq.q}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" size="sm">{faq.cat}</Badge>
                    <ChevronDown
                      className={`w-4 h-4 text-ink-muted transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-brand' : ''
                      }`}
                    />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-xs sm:text-sm text-ink-muted leading-relaxed border-t border-line/50 mt-1 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Support Inquiry */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-line">
          <MessageSquare className="w-5 h-5 text-brand" />
          <h2 className="font-bold text-base text-ink font-editorial">Need Community Assistance?</h2>
        </div>

        {supportSent ? (
          <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep space-y-1">
            <strong>Inquiry Simulated!</strong>
            <p>Our community stewards will review your note and respond in your notification center.</p>
          </div>
        ) : (
          <form onSubmit={handleSendSupport} className="space-y-3">
            <textarea
              value={supportMessage}
              onChange={e => setSupportMessage(e.target.value)}
              placeholder="Ask a question or report a concern with an exchange..."
              rows={3}
              className="w-full bg-surface-subtle text-ink text-xs rounded-xl border border-line p-3 focus:border-brand focus:outline-none"
              required
            />
            <Button variant="primary" size="sm" type="submit">
              Send Note to Community Stewards
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
