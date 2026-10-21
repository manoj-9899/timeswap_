export type SkillCategory = 
  | 'All'
  | 'Design & Creative'
  | 'Code & Technology'
  | 'Languages & Writing'
  | 'Crafts & Hands-on'
  | 'Music & Sound'
  | 'Wellness & Lifestyle'
  | 'Business & Strategy';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  description: string;
}

export interface Review {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  rating: number; // 1-5
  date: string;
  comment: string;
  skillSwapped: string;
  duration: string;
}

export interface Member {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  headline: string;
  bio: string;
  location: string;
  timezone: string;
  rating: number;
  reviewCount: number;
  hoursTaught: number;
  hoursLearned: number;
  skillsTeaching: SkillItem[];
  skillsLearning: string[];
  availability: {
    days: string[];
    timeSlot: string;
    preferredCadence: string;
  };
  isSaved?: boolean;
  joinedDate: string;
  badges: string[];
  reviews: Review[];
}

import type { SessionDuration } from '../lib/domain/duration';
export type { SessionDuration };

export interface Session {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherAvatar: string;
  learnerId: string;
  learnerName: string;
  learnerAvatar: string;
  skillTitle: string;
  category: SkillCategory;
  learningGoal: string;
  durationMinutes: SessionDuration;
  creditCost: number; // 1, 2, 3 whole credits
  scheduledDate: string;
  scheduledTime: string;
  status:
    | 'requested'
    | 'accepted'
    | 'declined'
    | 'expired'
    | 'upcoming'
    | 'pending'
    | 'completed'
    | 'cancelled'
    | 'cancelled_by_learner'
    | 'cancelled_by_teacher'
    | 'in_progress'
    | 'awaiting_completion'
    | 'under_review';
  teacherConfirmed: boolean;
  learnerConfirmed: boolean;
  meetingLink: string;
  messageNotes?: string;
  createdAt: string;
  completedAt?: string;
  transferFinalized: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'earned' | 'spent' | 'bonus' | 'refund';
  amount: number;
  counterpartyId: string;
  counterpartyName: string;
  counterpartyAvatar: string;
  sessionId?: string;
  skillTitle: string;
  status: 'completed' | 'pending' | 'cancelled';
  notes: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isProposal?: boolean;
  proposalDetails?: {
    skill: string;
    duration: string;
    proposedTime: string;
    creditCost: number;
  };
  clientMessageId?: string;
  status?: 'sending' | 'sent' | 'failed';
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  participantHeadline: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
  messages: ChatMessage[];
}

export interface NotificationItem {
  id: string;
  type:
    | 'welcome'
    | 'session_request'
    | 'session_accepted'
    | 'session_declined'
    | 'session_cancelled'
    | 'completion_pending'
    | 'credit_transfer'
    | 'dispute_flagged'
    | 'message'
    | 'community';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  actionUrl: string;
  creditImpact?: number;
  idempotencyKey?: string;
}

export interface CurrentUser extends Member {
  email: string;
  availableCredits: number;
  pendingCredits: number; // in escrow/pending completion
  lifetimeCreditsEarned: number;
  lifetimeCreditsSpent: number;
  notificationPreferences: {
    emailAlerts: boolean;
    sessionReminders: boolean;
    creditUpdates: boolean;
    communityDigest: boolean;
  };
  onboardingCompleted?: boolean;
  onboardingStep?: number;
}
