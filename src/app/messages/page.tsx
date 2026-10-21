'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  MessageSquare, 
  Search, 
  Send, 
  Check, 
  CheckCheck,
  Clock, 
  Sparkles, 
  Calendar, 
  User, 
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { CreditPill } from '../../components/ui/CreditPill';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

function MessagesContent() {
  const searchParams = useSearchParams();
  const selectedConvId = searchParams?.get('id');

  const { conversations, currentUser, sendMessage, markConversationRead } = useTimeSwap();
  const [activeConvId, setActiveConvId] = useState<string>(
    selectedConvId || ''
  );
  const [query, setQuery] = useState('');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activePeerOnline, setActivePeerOnline] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConvId) {
      setActiveConvId(selectedConvId);
    } else if (typeof window !== 'undefined' && window.innerWidth >= 768 && conversations.length > 0) {
      setActiveConvId(prev => prev || conversations[0].id);
    }
  }, [selectedConvId, conversations]);

  // Mark active conversation read when activeConvId changes
  useEffect(() => {
    if (activeConvId) {
      markConversationRead(activeConvId);
    }
  }, [activeConvId, markConversationRead]);

  // Scoped presence tracking strictly for active conversation
  const activeConversation = conversations.find(c => c.id === activeConvId);
  const peerId = activeConversation?.participantId;

  useEffect(() => {
    if (!activeConvId || !peerId || !currentUser?.id) return;

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const presenceChannel = supabase.channel(`conversation:${activeConvId}`, {
      config: {
        presence: {
          key: currentUser.id,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        if (state[peerId]) {
          setActivePeerOnline(true);
        } else {
          setActivePeerOnline(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key === peerId) {
          setActivePeerOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === peerId) {
          setActivePeerOnline(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    };
  }, [activeConvId, peerId, currentUser?.id]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const filteredConversations = conversations.filter(c =>
    c.participantName.toLowerCase().includes(query.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(query.toLowerCase())
  );

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeConvId || isSubmitting) return;

    const messageText = text.trim();
    setText('');
    setIsSubmitting(true);

    try {
      await sendMessage(activeConvId, messageText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = async (msgText: string) => {
    if (!activeConvId) return;
    await sendMessage(activeConvId, msgText);
  };

  return (
    <div className="bg-surface rounded-modal border border-line shadow-elevated overflow-hidden min-h-[520px] md:min-h-[640px] h-[calc(100dvh-11rem)] md:h-[680px] grid grid-cols-1 md:grid-cols-12">
        {/* Left: Conversation List (4 cols) */}
        <div className={`md:col-span-5 border-r border-line flex flex-col h-full ${activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-line space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-ink font-editorial">Conversations</h2>
              <Badge variant="neutral" size="sm">{conversations.length}</Badge>
            </div>
            <Input
              placeholder="Search conversations..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-line">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-muted">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map(c => {
                const isSelected = c.id === activeConvId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvId(c.id)}
                    className={`w-full p-3.5 sm:p-4 text-left flex items-start gap-3 transition-colors touch-target ${
                      isSelected
                        ? 'bg-surface-subtle font-semibold'
                        : 'hover:bg-surface-subtle/50'
                    }`}
                  >
                    <Avatar src={c.participantAvatar} name={c.participantName} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-ink truncate">{c.participantName}</span>
                        <span className="text-[10px] text-ink-muted">{c.lastMessageTime}</span>
                      </div>
                      <p className="text-xs text-ink-muted truncate">{c.lastMessage}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Chat Thread (7 cols) */}
        <div className={`md:col-span-7 flex flex-col h-full ${!activeConvId ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-line flex items-center justify-between gap-2 sm:gap-3 bg-canvas/40">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    aria-label="Back to conversations list"
                    onClick={() => setActiveConvId('')}
                    className="md:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink touch-target flex items-center justify-center flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={activeConversation.participantAvatar}
                      name={activeConversation.participantName}
                      size="sm"
                      verified
                    />
                    {activePeerOnline && (
                      <span
                        title="Online"
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface ring-1 ring-emerald-500/20"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold text-ink truncate">{activeConversation.participantName}</h2>
                      {activePeerOnline ? (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-medium border border-emerald-500/20 flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      ) : (
                        <span className="text-[10px] text-ink-muted flex-shrink-0">Offline</span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted truncate max-w-[150px] xs:max-w-xs">{activeConversation.participantHeadline}</p>
                  </div>
                </div>

                <Link href={`/members/${activeConversation.participantId}`} className="flex-shrink-0">
                  <Button variant="outline" size="sm">
                    <span className="hidden xs:inline">View Profile</span>
                    <span className="xs:hidden">Profile</span>
                  </Button>
                </Link>
              </div>

              {/* Message Feed */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                {activeConversation.messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-ink-muted space-y-2">
                    <Sparkles className="w-8 h-8 text-brand/40" />
                    <p className="text-xs font-semibold text-ink">Start a new skill conversation</p>
                    <p className="text-[11px] max-w-xs">Say hello and discuss skill topics or coordinate exchange hours.</p>
                  </div>
                ) : (
                  activeConversation.messages.map(msg => {
                    const isMine = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isMine
                              ? 'bg-brand text-white rounded-br-xs'
                              : 'bg-surface-subtle border border-line text-ink rounded-bl-xs'
                          }`}
                        >
                          <p>{msg.text}</p>

                          {/* Proposal Card if attached */}
                          {msg.isProposal && msg.proposalDetails && (
                            <div className={`mt-3 p-3 rounded-xl border text-xs ${isMine ? 'bg-white/10 border-white/20 text-white' : 'bg-surface border-line text-ink'}`}>
                              <div className="flex items-center justify-between font-bold pb-2 border-b border-current/20">
                                <span>{msg.proposalDetails.skill}</span>
                                <span>{msg.proposalDetails.creditCost} {msg.proposalDetails.creditCost === 1 ? 'Credit' : 'Credits'}</span>
                              </div>
                              <div className="pt-2 space-y-1 text-[11px] opacity-90">
                                <p>Duration: {msg.proposalDetails.duration}</p>
                                <p>Proposed Time: {msg.proposalDetails.proposedTime}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata row with delivery state */}
                        <div className="flex items-center gap-1.5 px-1 text-[10px] text-ink-muted">
                          <span>{msg.timestamp}</span>
                          {isMine && (
                            <>
                              {msg.status === 'sending' && (
                                <span className="flex items-center gap-0.5 text-ink-muted">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  <span>Sending...</span>
                                </span>
                              )}
                              {msg.status === 'failed' && (
                                <span className="flex items-center gap-1 text-rose-600 font-medium">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>Failed</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRetry(msg.text)}
                                    className="underline hover:text-rose-700 ml-1 inline-flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <RefreshCw className="w-2 h-2" /> Retry
                                  </button>
                                </span>
                              )}
                              {(msg.status === 'sent' || !msg.status) && (
                                <CheckCheck className="w-3 h-3 text-brand opacity-80" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Composer */}
              <form onSubmit={handleSend} className="p-3 border-t border-line bg-surface flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Type a message or discuss your exchange..."
                  value={text}
                  onChange={e => setText(e.target.value)}
                  disabled={isSubmitting}
                  className="flex-1 bg-surface-subtle text-ink text-xs rounded-xl border border-line px-3.5 py-2.5 focus:border-brand focus:outline-none disabled:opacity-50"
                />
                <Button 
                  variant="primary" 
                  size="md" 
                  type="submit" 
                  disabled={!text.trim() || isSubmitting} 
                  icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                >
                  Send
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-ink-muted space-y-2">
              <MessageSquare className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select a conversation from the list to view messages.</p>
            </div>
          )}
        </div>
      </div>
  );
}

export default function MessagesPage() {
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-8">
      <h1 className="sr-only">TimeSwap Direct Messenger</h1>
      <Suspense fallback={
        <div className="py-16 text-center text-xs text-ink-muted">
          Loading messenger...
        </div>
      }>
        <MessagesContent />
      </Suspense>
    </div>
  );
}
