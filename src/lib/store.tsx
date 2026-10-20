'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  Member, 
  CurrentUser, 
  Session, 
  Transaction, 
  Conversation, 
  ChatMessage, 
  NotificationItem, 
  SkillCategory, 
  SessionDuration 
} from '../types';
import { 
  INITIAL_MEMBERS, 
  INITIAL_CURRENT_USER, 
  INITIAL_SESSIONS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_CONVERSATIONS, 
  INITIAL_NOTIFICATIONS 
} from './mockData';
import { getSupabaseBrowserClient } from './supabase/client';

interface TimeSwapContextType {
  currentUser: CurrentUser;
  members: Member[];
  sessions: Session[];
  transactions: Transaction[];
  conversations: Conversation[];
  notifications: NotificationItem[];
  isLoaded: boolean;
  authUserId: string | null;
  backendStatus: 'connected' | 'unconfigured' | 'error';
  isDemoMode: boolean;
  
  // Actions
  updateCurrentUser: (updates: Partial<CurrentUser>) => void;
  toggleSaveMember: (memberId: string) => void;
  requestSession: (data: {
    teacherId: string;
    skillTitle: string;
    category: SkillCategory;
    learningGoal: string;
    durationMinutes: SessionDuration;
    scheduledDate: string;
    scheduledTime: string;
    messageNotes?: string;
  }) => Promise<{ success: boolean; error?: string; session?: Session }>;
  confirmCompletion: (
    sessionId: string, 
    asRole: 'teacher' | 'learner'
  ) => Promise<{ success: boolean; bothConfirmed: boolean; creditTransferred: number; error?: string }>;
  acceptSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  declineSession: (sessionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  cancelSession: (sessionId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
  sendMessage: (
    conversationId: string, 
    text: string, 
    isProposal?: boolean, 
    proposalDetails?: any
  ) => Promise<{ success: boolean; error?: string }>;
  createConversationWithMember: (memberId: string, initialMessage?: string) => Promise<string> | string;
  markConversationRead: (conversationId: string) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  resetDemoData: () => void;
  signOut: () => Promise<void>;
}

const STORAGE_KEY = 'timeswap_state_v1';

const TimeSwapContext = createContext<TimeSwapContextType | null>(null);

export function TimeSwapProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser>(INITIAL_CURRENT_USER);
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'unconfigured' | 'error'>('unconfigured');
  const [isDemoMode, setIsDemoMode] = useState(true);

  // Sync Supabase Auth & Member Discovery
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setBackendStatus('unconfigured');
      setIsDemoMode(true);
      return;
    }

    setBackendStatus('connected');
    setIsDemoMode(false);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setAuthUserId(session.user.id);

        // 1. Fetch user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        // 2. Fetch user's wallet
        const { data: wallet } = await supabase
          .from('credit_wallets')
          .select('*')
          .eq('profile_id', session.user.id)
          .maybeSingle();

        const p = profile as any;
        const w = wallet as any;

        if (p) {
          setCurrentUser(prev => ({
            ...prev,
            id: p.id,
            name: p.name,
            handle: p.handle,
            email: session.user.email || prev.email,
            avatar: p.avatar_url || prev.avatar,
            headline: p.headline || prev.headline,
            bio: p.bio || prev.bio,
            location: p.location || prev.location,
            timezone: p.timezone || prev.timezone,
            rating: Number(p.rating) || 5.0,
            reviewCount: p.review_count || 0,
            hoursTaught: p.hours_taught || 0,
            hoursLearned: p.hours_learned || 0,
            availableCredits: w ? w.available_balance : 0,
            pendingCredits: w ? w.escrow_balance : 0,
            lifetimeCreditsEarned: w ? w.lifetime_earned : 0,
            lifetimeCreditsSpent: w ? w.lifetime_spent : 0,
            onboardingCompleted: p.onboarding_completed,
            onboardingStep: p.onboarding_step,
            skillsLearning: p.skills_learning || prev.skillsLearning,
          }));
        }

        // 3. Fetch verified discovery members from Supabase
        const { data: dbMembers } = await supabase
          .from('profiles')
          .select(`
            id, name, handle, avatar_url, headline, bio, location, timezone,
            rating, review_count, hours_taught, hours_learned, badges, skills_learning,
            member_skills (
              id, proficiency, description,
              skills ( name, category )
            ),
            availability_slots (
              day_of_week, start_time, end_time, preferred_cadence
            )
          `)
          .eq('onboarding_completed', true);

        if (dbMembers && dbMembers.length > 0) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const mappedDbMembers: Member[] = dbMembers.map((m: any) => ({
            id: m.id,
            name: m.name,
            handle: m.handle,
            avatar: m.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            headline: m.headline || '',
            bio: m.bio || '',
            location: m.location || '',
            timezone: m.timezone || 'UTC',
            rating: Number(m.rating) || 5.0,
            reviewCount: m.review_count || 0,
            hoursTaught: m.hours_taught || 0,
            hoursLearned: m.hours_learned || 0,
            skillsTeaching: (m.member_skills || []).map((ms: any) => ({
              id: ms.id,
              name: ms.skills?.name || 'Skill',
              category: ms.skills?.category || 'Design & Creative',
              proficiency: ms.proficiency,
              description: ms.description || '',
            })),
            skillsLearning: m.skills_learning || [],
            availability: {
              days: (m.availability_slots || []).map((s: any) => dayNames[s.day_of_week] || 'Monday'),
              timeSlot: m.availability_slots?.[0] ? `${m.availability_slots[0].start_time} to ${m.availability_slots[0].end_time}` : '18:00 to 21:00 UTC',
              preferredCadence: m.availability_slots?.[0]?.preferred_cadence || 'Weekly exchanges',
            },
            joinedDate: 'Verified Member',
            badges: m.badges || ['Verified Peer'],
            reviews: [],
          }));

          setMembers(prev => {
            const existingIds = new Set(mappedDbMembers.map(dm => dm.id));
            const remainingMock = INITIAL_MEMBERS.filter(im => !existingIds.has(im.id));
            return [...mappedDbMembers, ...remainingMock];
          });
        }

        // 4. Fetch user's sessions from public.sessions
        const { data: dbSessions } = await (supabase
          .from('sessions') as any)
          .select(`
            *,
            teacher:teacher_id ( name, avatar_url ),
            learner:learner_id ( name, avatar_url ),
            session_confirmations ( user_id, role )
          `)
          .or(`teacher_id.eq.${session.user.id},learner_id.eq.${session.user.id}`);

        if (dbSessions && dbSessions.length > 0) {
          const mappedSessions: Session[] = dbSessions.map((s: any) => {
            const teacherConfirmed = (s.session_confirmations || []).some((c: any) => c.role === 'teacher');
            const learnerConfirmed = (s.session_confirmations || []).some((c: any) => c.role === 'learner');
            const startDate = new Date(s.scheduled_start_at);
            return {
              id: s.id,
              teacherId: s.teacher_id,
              teacherName: s.teacher?.name || 'Mentor',
              teacherAvatar: s.teacher?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              learnerId: s.learner_id,
              learnerName: s.learner?.name || 'Learner',
              learnerAvatar: s.learner?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              skillTitle: s.skill_title,
              category: s.category,
              learningGoal: s.learning_goal,
              durationMinutes: s.duration_minutes as SessionDuration,
              creditCost: s.credit_cost,
              scheduledDate: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              scheduledTime: startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              status: s.status,
              teacherConfirmed,
              learnerConfirmed,
              meetingLink: s.meeting_link || `https://meet.timeswap.org/room/${s.id}`,
              messageNotes: s.message_notes,
              createdAt: new Date(s.created_at).toLocaleDateString(),
              completedAt: s.status === 'completed' ? new Date(s.updated_at).toLocaleDateString() : undefined,
              transferFinalized: s.status === 'completed',
            };
          });

          setSessions(prev => {
            const existingIds = new Set(mappedSessions.map(ms => ms.id));
            const remaining = prev.filter(p => !existingIds.has(p.id));
            return [...mappedSessions, ...remaining];
          });
        }

        // 5. Fetch transactions from public.credit_ledger
        const { data: dbLedger } = await (supabase
          .from('credit_ledger') as any)
          .select(`*`)
          .or(`source_wallet_id.eq.${session.user.id},destination_wallet_id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (dbLedger && dbLedger.length > 0) {
          const mappedTxs: Transaction[] = dbLedger.map((tx: any) => {
            const isEarned = tx.destination_wallet_id === session.user.id && tx.source_wallet_id !== session.user.id;
            const isRefund = tx.entry_type === 'escrow_refund';
            const isBonus = tx.entry_type === 'welcome_grant';
            return {
              id: tx.id,
              date: new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              type: isBonus ? 'bonus' : isRefund ? 'refund' : isEarned ? 'earned' : 'spent',
              amount: tx.amount,
              counterpartyId: tx.destination_wallet_id === session.user.id ? (tx.source_wallet_id || 'System') : (tx.destination_wallet_id || 'System'),
              counterpartyName: isBonus ? 'TimeSwap Community' : isRefund ? 'Escrow Return' : 'Exchange Counterparty',
              counterpartyAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
              sessionId: tx.session_id,
              skillTitle: tx.notes || 'Time Credit Transfer',
              status: 'completed',
              notes: tx.notes,
            };
          });

          setTransactions(mappedTxs);
        }

        // 6. Fetch conversations and messages from Supabase
        try {
          const { data: dbMemberships } = await (supabase
            .from('conversation_members') as any)
            .select('conversation_id, last_read_at')
            .eq('profile_id', session.user.id);

          if (dbMemberships && dbMemberships.length > 0) {
            const convIds = dbMemberships.map((m: any) => m.conversation_id);

            const { data: dbPeers } = await (supabase
              .from('conversation_members') as any)
              .select(`
                conversation_id,
                profile_id,
                profile:profile_id (
                  id, name, avatar_url, headline
                )
              `)
              .in('conversation_id', convIds)
              .neq('profile_id', session.user.id);

            const { data: dbMessages } = await (supabase
              .from('messages') as any)
              .select('*')
              .in('conversation_id', convIds)
              .order('created_at', { ascending: true });

            const membershipMap = new Map<string, string>();
            dbMemberships.forEach((m: any) => membershipMap.set(m.conversation_id, m.last_read_at));

            const peerMap = new Map<string, any>();
            (dbPeers || []).forEach((p: any) => peerMap.set(p.conversation_id, p));

            const mappedConversations: Conversation[] = convIds.map((cId: string) => {
              const peer = peerMap.get(cId);
              const lastReadAt = membershipMap.get(cId) || '1970-01-01T00:00:00Z';
              const convMsgs = (dbMessages || []).filter((m: any) => m.conversation_id === cId);
              const lastMsg = convMsgs[convMsgs.length - 1];

              const unreadCount = convMsgs.filter(
                (m: any) => m.sender_id !== session.user.id && new Date(m.created_at) > new Date(lastReadAt)
              ).length;

              return {
                id: cId,
                participantId: peer?.profile?.id || peer?.profile_id || 'peer',
                participantName: peer?.profile?.name || 'Exchange Partner',
                participantAvatar: peer?.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                participantHeadline: peer?.profile?.headline || 'Skill Exchange Partner',
                lastMessage: lastMsg?.body || 'Conversation started',
                lastMessageTime: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
                unreadCount,
                messages: convMsgs.map((m: any) => ({
                  id: m.id,
                  senderId: m.sender_id,
                  senderName: m.sender_id === session.user.id ? (p?.name || 'You') : (peer?.profile?.name || 'Exchange Partner'),
                  text: m.body,
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isProposal: m.is_proposal,
                  proposalDetails: m.proposal_details,
                  clientMessageId: m.client_message_id,
                  status: 'sent' as const,
                })),
              };
            });

            setConversations(prev => {
              const dbIds = new Set(mappedConversations.map(c => c.id));
              const remaining = prev.filter(c => !dbIds.has(c.id));
              return [...mappedConversations, ...remaining];
            });
          }
        } catch (convErr) {
          console.warn('Error fetching Supabase conversations:', convErr);
        }

        // 7. Fetch in-app notifications from Supabase
        try {
          const { data: dbNotifs } = await (supabase
            .from('notifications') as any)
            .select('*')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(50);

          if (dbNotifs && dbNotifs.length > 0) {
            const mappedNotifs: NotificationItem[] = dbNotifs.map((n: any) => {
              const notifDate = new Date(n.created_at);
              return {
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                actionUrl: n.action_url || '/dashboard',
                creditImpact: n.credit_impact || undefined,
                isRead: n.is_read,
                timestamp: notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                idempotencyKey: n.idempotency_key,
              };
            });

            setNotifications(prev => {
              const dbIds = new Set(mappedNotifs.map(n => n.id));
              const remaining = prev.filter(n => !dbIds.has(n.id));
              return [...mappedNotifs, ...remaining];
            });
          }
        } catch (notifErr) {
          console.warn('Error fetching Supabase notifications:', notifErr);
        }
      } else {
        setAuthUserId(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Supabase Realtime Channels for Live Notifications and Messages
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !authUserId) return;

    // Realtime channel for in-app notifications
    const notifChannel = supabase
      .channel(`realtime-notifications-${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          const newNotif = payload.new as any;
          setNotifications(prev => {
            if (prev.some(n => n.id === newNotif.id || (newNotif.idempotency_key && n.idempotencyKey === newNotif.idempotency_key))) {
              return prev;
            }
            const mappedItem: NotificationItem = {
              id: newNotif.id,
              type: newNotif.type,
              title: newNotif.title,
              body: newNotif.body,
              actionUrl: newNotif.action_url || '/dashboard',
              creditImpact: newNotif.credit_impact || undefined,
              isRead: newNotif.is_read,
              timestamp: 'Just now',
              idempotencyKey: newNotif.idempotency_key,
            };
            return [mappedItem, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${authUserId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          setNotifications(prev =>
            prev.map(n => (n.id === updated.id ? { ...n, isRead: updated.is_read } : n))
          );
        }
      )
      .subscribe();

    // Realtime channel for live messages
    const msgChannel = supabase
      .channel(`realtime-messages-${authUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          setConversations(prev => {
            const conv = prev.find(c => c.id === newMsg.conversation_id);
            if (!conv) return prev;

            const isDuplicate = conv.messages.some(
              m => m.id === newMsg.id || (newMsg.client_message_id && m.clientMessageId === newMsg.client_message_id)
            );

            const formattedMsg: ChatMessage = {
              id: newMsg.id,
              senderId: newMsg.sender_id,
              senderName: newMsg.sender_id === authUserId ? currentUser.name : conv.participantName,
              text: newMsg.body,
              timestamp: 'Just now',
              isProposal: newMsg.is_proposal,
              proposalDetails: newMsg.proposal_details,
              clientMessageId: newMsg.client_message_id,
              status: 'sent',
            };

            const updatedMessages = isDuplicate
              ? conv.messages.map(m =>
                  (m.id === newMsg.id || (newMsg.client_message_id && m.clientMessageId === newMsg.client_message_id))
                    ? formattedMsg
                    : m
                )
              : [...conv.messages, formattedMsg];

            const isFromOther = newMsg.sender_id !== authUserId;

            return prev.map(c =>
              c.id === newMsg.conversation_id
                ? {
                    ...c,
                    lastMessage: newMsg.body,
                    lastMessageTime: 'Just now',
                    unreadCount: isFromOther ? c.unreadCount + 1 : c.unreadCount,
                    messages: updatedMessages,
                  }
                : c
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(msgChannel);
    };
  }, [authUserId, currentUser.name]);

  // Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.currentUser) setCurrentUser(parsed.currentUser);
        if (parsed.members) setMembers(parsed.members);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.transactions) setTransactions(parsed.transactions);
        if (parsed.conversations) setConversations(parsed.conversations);
        if (parsed.notifications) setNotifications(parsed.notifications);
      }
    } catch (err) {
      console.warn('Failed to load TimeSwap state from localStorage:', err);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentUser,
          members,
          sessions,
          transactions,
          conversations,
          notifications,
        })
      );
    } catch (err) {
      console.warn('Failed to save TimeSwap state to localStorage:', err);
    }
  }, [currentUser, members, sessions, transactions, conversations, notifications, isLoaded]);

  const updateCurrentUser = useCallback((updates: Partial<CurrentUser>) => {
    setCurrentUser(prev => ({ ...prev, ...updates }));

    const supabase = getSupabaseBrowserClient();
    if (supabase && authUserId) {
      (supabase.from('profiles') as any)
        .update({
          name: updates.name,
          headline: updates.headline,
          bio: updates.bio,
          location: updates.location,
          timezone: updates.timezone,
          avatar_url: updates.avatar,
          skills_learning: updates.skillsLearning,
          onboarding_completed: updates.onboardingCompleted,
          onboarding_step: updates.onboardingStep,
        })
        .eq('id', authUserId)
        .then(() => {});
    }
  }, [authUserId]);

  const toggleSaveMember = useCallback((memberId: string) => {
    setMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, isSaved: !m.isSaved } : m))
    );
  }, []);

  const requestSession = useCallback(async (data: {
    teacherId: string;
    skillTitle: string;
    category: SkillCategory;
    learningGoal: string;
    durationMinutes: SessionDuration;
    scheduledDate: string;
    scheduledTime: string;
    messageNotes?: string;
  }) => {
    if (currentUser.onboardingCompleted === false) {
      return {
        success: false,
        error: 'Profile incomplete: Please finish your mentor profile onboarding before requesting a skill exchange.'
      };
    }

    const cost = data.durationMinutes === 60 ? 1 : data.durationMinutes === 120 ? 2 : 3;

    if (currentUser.availableCredits < cost) {
      return {
        success: false,
        error: `Insufficient time credits. You have ${currentUser.availableCredits} credit(s), but this exchange requires ${cost} credit(s). Teach a skill to earn credits!`
      };
    }

    const teacher = members.find(m => m.id === data.teacherId);
    if (!teacher) {
      return { success: false, error: 'Mentor not found.' };
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (!authUserId) {
        return { success: false, error: 'Authentication required: please sign in to request a session.' };
      }
      try {
        const scheduledStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const idempotencyKey = `req_${authUserId}_${data.teacherId}_${Date.now()}`;

        const { data: rpcRes, error } = await (supabase as any).rpc('create_session_request', {
          p_teacher_id: data.teacherId,
          p_skill_id: null,
          p_skill_title: data.skillTitle,
          p_category: data.category,
          p_learning_goal: data.learningGoal,
          p_duration_minutes: data.durationMinutes,
          p_scheduled_start_at: scheduledStart,
          p_message_notes: data.messageNotes || null,
          p_idempotency_key: idempotencyKey,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        setCurrentUser(prev => ({
          ...prev,
          availableCredits: prev.availableCredits - cost,
          pendingCredits: prev.pendingCredits + cost,
        }));

        const newSession: Session = {
          id: rpcRes.id,
          teacherId: teacher.id,
          teacherName: teacher.name,
          teacherAvatar: teacher.avatar,
          learnerId: currentUser.id,
          learnerName: currentUser.name,
          learnerAvatar: currentUser.avatar,
          skillTitle: data.skillTitle,
          category: data.category,
          learningGoal: data.learningGoal,
          durationMinutes: data.durationMinutes,
          creditCost: cost,
          scheduledDate: data.scheduledDate,
          scheduledTime: data.scheduledTime,
          status: 'requested',
          teacherConfirmed: false,
          learnerConfirmed: false,
          meetingLink: `https://meet.timeswap.org/room/${rpcRes.id}`,
          messageNotes: data.messageNotes,
          createdAt: 'Just now',
          transferFinalized: false,
        };

        setSessions(prev => [newSession, ...prev]);

        return { success: true, session: newSession };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to submit request to database' };
      }
    }

    // Mock fallback mode when Supabase is not configured
    const newSessionId = `sess-${Date.now()}`;
    const newSession: Session = {
      id: newSessionId,
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherAvatar: teacher.avatar,
      learnerId: currentUser.id,
      learnerName: currentUser.name,
      learnerAvatar: currentUser.avatar,
      skillTitle: data.skillTitle,
      category: data.category,
      learningGoal: data.learningGoal,
      durationMinutes: data.durationMinutes,
      creditCost: cost,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      status: 'requested',
      teacherConfirmed: false,
      learnerConfirmed: false,
      meetingLink: `https://meet.timeswap.org/room/${teacher.handle}-${currentUser.handle}-${Math.floor(1000 + Math.random() * 9000)}`,
      messageNotes: data.messageNotes,
      createdAt: 'Just now',
      transferFinalized: false
    };

    setCurrentUser(prev => ({
      ...prev,
      availableCredits: prev.availableCredits - cost,
      pendingCredits: prev.pendingCredits + cost,
    }));

    setSessions(prev => [newSession, ...prev]);

    return { success: true, session: newSession };
  }, [currentUser, members, authUserId]);

  // Bilateral confirmation execution
  const confirmCompletion = useCallback(async (
    sessionId: string,
    asRole: 'teacher' | 'learner'
  ) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) {
      return { success: false, bothConfirmed: false, creditTransferred: 0, error: 'Session not found' };
    }

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (!authUserId) {
        return { success: false, bothConfirmed: false, creditTransferred: 0, error: 'Authentication required: please sign in to confirm completion.' };
      }
      try {
        const { data: res, error } = await (supabase as any).rpc('confirm_session_completion', {
          p_session_id: sessionId,
        });

        if (error) {
          return { success: false, bothConfirmed: false, creditTransferred: 0, error: error.message };
        }

        const isBothConfirmed = Boolean(res?.both_confirmed);
        const settled = Boolean(res?.settled);

        setSessions(prev =>
          prev.map(s => {
            if (s.id !== sessionId) return s;
            return {
              ...s,
              teacherConfirmed: asRole === 'teacher' ? true : s.teacherConfirmed,
              learnerConfirmed: asRole === 'learner' ? true : s.learnerConfirmed,
              status: isBothConfirmed ? 'completed' : 'awaiting_completion',
              completedAt: isBothConfirmed ? 'Today' : s.completedAt,
              transferFinalized: isBothConfirmed,
            };
          })
        );

        if (settled) {
          const { data: refreshedWallet } = await (supabase
            .from('credit_wallets') as any)
            .select('*')
            .eq('profile_id', authUserId)
            .maybeSingle();

          if (refreshedWallet) {
            setCurrentUser(prev => ({
              ...prev,
              availableCredits: refreshedWallet.available_balance,
              pendingCredits: refreshedWallet.escrow_balance,
              lifetimeCreditsEarned: refreshedWallet.lifetime_earned,
              lifetimeCreditsSpent: refreshedWallet.lifetime_spent,
            }));
          }
        }

        return {
          success: true,
          bothConfirmed: isBothConfirmed,
          creditTransferred: settled ? session.creditCost : 0,
        };
      } catch (err: any) {
        return { success: false, bothConfirmed: false, creditTransferred: 0, error: err.message };
      }
    }

    // Mock fallback mode when Supabase is unconfigured:
    const teacherConfirmed = asRole === 'teacher' ? true : session.teacherConfirmed;
    const learnerConfirmed = asRole === 'learner' ? true : session.learnerConfirmed;
    const bothConfirmed = teacherConfirmed && learnerConfirmed;

    const updatedSession: Session = {
      ...session,
      teacherConfirmed,
      learnerConfirmed,
      status: bothConfirmed ? 'completed' : 'awaiting_completion',
      completedAt: bothConfirmed ? 'Today' : session.completedAt,
      transferFinalized: bothConfirmed
    };

    setSessions(prev => prev.map(s => (s.id === sessionId ? updatedSession : s)));

    if (bothConfirmed) {
      const cost = session.creditCost;
      const hours = session.durationMinutes / 60;
      const isCurrentUserTeacher = session.teacherId === currentUser.id;
      const isCurrentUserLearner = session.learnerId === currentUser.id;

      if (isCurrentUserTeacher) {
        setCurrentUser(prev => ({
          ...prev,
          availableCredits: prev.availableCredits + cost,
          lifetimeCreditsEarned: prev.lifetimeCreditsEarned + cost,
          hoursTaught: prev.hoursTaught + hours,
        }));
      } else if (isCurrentUserLearner) {
        setCurrentUser(prev => ({
          ...prev,
          pendingCredits: Math.max(0, prev.pendingCredits - cost),
          lifetimeCreditsSpent: prev.lifetimeCreditsSpent + cost,
          hoursLearned: prev.hoursLearned + hours,
        }));
      }

      return { success: true, bothConfirmed: true, creditTransferred: cost };
    }

    return { success: true, bothConfirmed: false, creditTransferred: 0 };
  }, [sessions, currentUser, authUserId]);

  const acceptSession = useCallback(async (sessionId: string) => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (!authUserId) {
        return { success: false, error: 'Authentication required: please sign in to accept a session.' };
      }
      try {
        const { error } = await (supabase as any).rpc('accept_session_request', {
          p_session_id: sessionId,
        });
        if (error) {
          console.error('Failed to accept session via RPC:', error);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('Error in accept_session_request RPC:', err);
        return { success: false, error: err.message };
      }
    }

    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, status: 'accepted' as const } : s))
    );
    return { success: true };
  }, [authUserId]);

  const declineSession = useCallback(async (sessionId: string, reason?: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (!authUserId) {
        return { success: false, error: 'Authentication required: please sign in to decline a session.' };
      }
      try {
        const { error } = await (supabase as any).rpc('decline_session_request', {
          p_session_id: sessionId,
          p_reason: reason || 'Mentor unable to accept at this time.',
        });
        if (error) {
          console.error('Failed to decline session via RPC:', error);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('Error in decline_session_request RPC:', err);
        return { success: false, error: err.message };
      }
    }

    if (session && session.learnerId === currentUser.id) {
      setCurrentUser(prev => ({
        ...prev,
        availableCredits: prev.availableCredits + session.creditCost,
        pendingCredits: Math.max(0, prev.pendingCredits - session.creditCost),
      }));
    }

    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, status: 'declined' as const } : s))
    );
    return { success: true };
  }, [sessions, currentUser.id, authUserId]);

  const cancelSession = useCallback(async (sessionId: string, reason?: string) => {
    const session = sessions.find(s => s.id === sessionId);
    const supabase = getSupabaseBrowserClient();
    let newStatus: Session['status'] = 'cancelled';

    if (supabase) {
      if (!authUserId) {
        return { success: false, error: 'Authentication required: please sign in to cancel a session.' };
      }
      try {
        const { data: res, error } = await (supabase as any).rpc('cancel_session', {
          p_session_id: sessionId,
          p_reason: reason || 'Cancelled by participant.',
        });
        if (error) {
          console.error('Failed to cancel session via RPC:', error);
          return { success: false, error: error.message };
        }
        if (res && res.status) {
          newStatus = res.status;
        }

        // Re-fetch wallet balances
        const { data: refreshedWallet } = await (supabase
          .from('credit_wallets') as any)
          .select('*')
          .eq('profile_id', authUserId)
          .maybeSingle();

        if (refreshedWallet) {
          setCurrentUser(prev => ({
            ...prev,
            availableCredits: refreshedWallet.available_balance,
            pendingCredits: refreshedWallet.escrow_balance,
            lifetimeCreditsEarned: refreshedWallet.lifetime_earned,
            lifetimeCreditsSpent: refreshedWallet.lifetime_spent,
          }));
        }
      } catch (err: any) {
        console.error('Error in cancel_session RPC:', err);
        return { success: false, error: err.message };
      }
    } else {
      newStatus = session?.teacherId === currentUser.id ? 'cancelled_by_teacher' : 'cancelled_by_learner';
      if (session && session.learnerId === currentUser.id) {
        setCurrentUser(prev => ({
          ...prev,
          availableCredits: prev.availableCredits + session.creditCost,
          pendingCredits: Math.max(0, prev.pendingCredits - session.creditCost),
        }));
      }
    }

    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, status: newStatus } : s))
    );
    return { success: true };
  }, [sessions, currentUser.id, authUserId]);

  const sendMessage = useCallback(async (
    conversationId: string, 
    text: string, 
    isProposal: boolean = false, 
    proposalDetails: any = null
  ) => {
    if (!text.trim()) return { success: false, error: 'Message cannot be empty.' };
    const trimmed = text.trim();
    const clientMsgId = `cli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const optimisticMsg: ChatMessage = {
      id: clientMsgId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      text: trimmed,
      timestamp: 'Just now',
      isProposal,
      proposalDetails,
      clientMessageId: clientMsgId,
      status: 'sending',
    };

    setConversations(prev =>
      prev.map(c =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: trimmed,
              lastMessageTime: 'Just now',
              messages: [...c.messages, optimisticMsg],
            }
          : c
      )
    );

    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      if (!authUserId) {
        return { success: false, bothConfirmed: false, creditTransferred: 0, error: 'Authentication required: please sign in to confirm completion.' };
      }
      try {
        const { data: rpcRes, error } = await (supabase as any).rpc('send_message', {
          p_conversation_id: conversationId,
          p_body: trimmed,
          p_is_proposal: isProposal,
          p_proposal_details: proposalDetails,
          p_client_message_id: clientMsgId,
        });

        if (error) {
          console.error('send_message RPC error:', error);
          setConversations(prev =>
            prev.map(c =>
              c.id === conversationId
                ? {
                    ...c,
                    messages: c.messages.map(m =>
                      m.clientMessageId === clientMsgId ? { ...m, status: 'failed' as const } : m
                    ),
                  }
                : c
            )
          );
          return { success: false, error: error.message };
        }

        setConversations(prev =>
          prev.map(c =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map(m =>
                    m.clientMessageId === clientMsgId
                      ? {
                          ...m,
                          id: (rpcRes as any)?.id || m.id,
                          status: 'sent' as const,
                        }
                      : m
                  ),
                }
              : c
          )
        );
        return { success: true };
      } catch (err: any) {
        console.error('Error invoking send_message:', err);
        return { success: false, error: err.message };
      }
    }
    return { success: true };
  }, [currentUser.id, currentUser.name, authUserId]);

  const createConversationWithMember = useCallback(async (memberId: string, initialMessage?: string) => {
    const existing = conversations.find(c => c.participantId === memberId);
    if (existing) {
      if (initialMessage) {
        await sendMessage(existing.id, initialMessage);
      }
      return existing.id;
    }

    const member = members.find(m => m.id === memberId);
    const targetName = member?.name || 'Exchange Partner';
    const targetAvatar = member?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';
    const targetHeadline = member?.headline || '';

    let assignedConvId = `conv-${Date.now()}`;

    const supabase = getSupabaseBrowserClient();
    if (supabase && authUserId) {
      try {
        const { data: convId, error } = await (supabase as any).rpc('get_or_create_conversation', {
          p_recipient_id: memberId,
        });
        if (!error && convId) {
          assignedConvId = convId;
        }
      } catch (err) {
        console.error('get_or_create_conversation error:', err);
      }
    }

    const newConv: Conversation = {
      id: assignedConvId,
      participantId: memberId,
      participantName: targetName,
      participantAvatar: targetAvatar,
      participantHeadline: targetHeadline,
      lastMessage: initialMessage || 'Conversation started',
      lastMessageTime: 'Just now',
      unreadCount: 0,
      messages: [],
    };

    setConversations(prev => [newConv, ...prev.filter(c => c.id !== assignedConvId)]);

    if (initialMessage) {
      await sendMessage(assignedConvId, initialMessage);
    }

    return assignedConvId;
  }, [conversations, members, authUserId, sendMessage]);

  const markConversationRead = useCallback((conversationId: string) => {
    setConversations(prev => {
      const conv = prev.find(c => c.id === conversationId);
      if (!conv || conv.unreadCount === 0) return prev;
      return prev.map(c => (c.id === conversationId ? { ...c, unreadCount: 0 } : c));
    });
    setNotifications(prev => {
      const hasUnread = prev.some(n => n.actionUrl === `/messages?id=${conversationId}` && !n.isRead);
      if (!hasUnread) return prev;
      return prev.map(n =>
        n.actionUrl === `/messages?id=${conversationId}` ? { ...n, isRead: true } : n
      );
    });

    const supabase = getSupabaseBrowserClient();
    if (supabase && authUserId) {
      (supabase as any).rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      }).then(() => {});
    }
  }, [authUserId]);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
    );

    const supabase = getSupabaseBrowserClient();
    if (supabase && authUserId) {
      (supabase as any).rpc('mark_notification_read', {
        p_notification_id: notificationId,
      }).then(() => {});
    }
  }, [authUserId]);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    const supabase = getSupabaseBrowserClient();
    if (supabase && authUserId) {
      (supabase as any).rpc('mark_all_notifications_read').then(() => {});
    }
  }, [authUserId]);

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(INITIAL_CURRENT_USER);
    setMembers(INITIAL_MEMBERS);
    setSessions(INITIAL_SESSIONS);
    setTransactions(INITIAL_TRANSACTIONS);
    setConversations(INITIAL_CONVERSATIONS);
    setNotifications(INITIAL_NOTIFICATIONS);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAuthUserId(null);
    setCurrentUser(INITIAL_CURRENT_USER);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <TimeSwapContext.Provider
      value={{
        currentUser,
        members,
        sessions,
        transactions,
        conversations,
        notifications,
        isLoaded,
        authUserId,
        backendStatus,
        isDemoMode,
        updateCurrentUser,
        toggleSaveMember,
        requestSession,
        confirmCompletion,
        acceptSession,
        declineSession,
        cancelSession,
        sendMessage,
        createConversationWithMember,
        markConversationRead,
        markNotificationRead,
        markAllNotificationsRead,
        resetDemoData,
        signOut
      }}
    >
      {children}
    </TimeSwapContext.Provider>
  );
}

export function useTimeSwap() {
  const context = useContext(TimeSwapContext);
  if (!context) {
    throw new Error('useTimeSwap must be used within a TimeSwapProvider');
  }
  return context;
}
