export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SkillCategory =
  | 'Design & Creative'
  | 'Code & Technology'
  | 'Languages & Writing'
  | 'Crafts & Hands-on'
  | 'Music & Sound'
  | 'Wellness & Lifestyle'
  | 'Business & Strategy';

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';

export type SessionDurationHours = 60 | 120 | 180;
export type SessionCreditCost = 1 | 2 | 3;

export type SessionLifecycleStatus =
  | 'requested'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled_by_learner'
  | 'cancelled_by_teacher'
  | 'in_progress'
  | 'awaiting_completion'
  | 'completed'
  | 'under_review';

export type CreditLedgerEntryType =
  | 'welcome_grant'
  | 'escrow_hold'
  | 'escrow_release_earned'
  | 'escrow_refund'
  | 'escrow_cancellation_transfer'
  | 'admin_adjustment';

export type NotificationType =
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

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          handle: string;
          name: string;
          avatar_url: string | null;
          headline: string | null;
          bio: string | null;
          location: string | null;
          timezone: string;
          rating: number;
          review_count: number;
          hours_taught: number;
          hours_learned: number;
          notification_preferences: Json;
          onboarding_completed: boolean;
          onboarding_step: number;
          skills_learning: string[];
          badges: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          handle: string;
          name: string;
          avatar_url?: string | null;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          timezone?: string;
          rating?: number;
          review_count?: number;
          hours_taught?: number;
          hours_learned?: number;
          notification_preferences?: Json;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          skills_learning?: string[];
          badges?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          handle?: string;
          name?: string;
          avatar_url?: string | null;
          headline?: string | null;
          bio?: string | null;
          location?: string | null;
          timezone?: string;
          rating?: number;
          review_count?: number;
          hours_taught?: number;
          hours_learned?: number;
          notification_preferences?: Json;
          onboarding_completed?: boolean;
          onboarding_step?: number;
          skills_learning?: string[];
          badges?: string[];
          updated_at?: string;
        };
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category: SkillCategory;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category: SkillCategory;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category?: SkillCategory;
        };
      };
      member_skills: {
        Row: {
          id: string;
          profile_id: string;
          skill_id: string;
          proficiency: SkillProficiency;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          skill_id: string;
          proficiency: SkillProficiency;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          proficiency?: SkillProficiency;
          description?: string | null;
        };
      };
      availability_slots: {
        Row: {
          id: string;
          profile_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone: string;
          preferred_cadence: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone?: string;
          preferred_cadence?: string | null;
          created_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          timezone?: string;
          preferred_cadence?: string | null;
        };
      };
      saved_members: {
        Row: {
          user_id: string;
          saved_profile_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          saved_profile_id: string;
          created_at?: string;
        };
        Update: never;
      };
      credit_wallets: {
        Row: {
          profile_id: string;
          available_balance: number;
          escrow_balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          available_balance?: number;
          escrow_balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
        };
        Update: {
          available_balance?: number;
          escrow_balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
          updated_at?: string;
        };
      };
      sessions: {
        Row: {
          id: string;
          teacher_id: string;
          learner_id: string;
          skill_id: string | null;
          skill_title: string;
          category: SkillCategory;
          learning_goal: string;
          duration_minutes: SessionDurationHours;
          credit_cost: SessionCreditCost;
          scheduled_start_at: string;
          scheduled_end_at: string;
          status: SessionLifecycleStatus;
          meeting_link: string | null;
          message_notes: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          learner_id: string;
          skill_id?: string | null;
          skill_title: string;
          category: SkillCategory;
          learning_goal: string;
          duration_minutes: SessionDurationHours;
          credit_cost: SessionCreditCost;
          scheduled_start_at: string;
          scheduled_end_at: string;
          status?: SessionLifecycleStatus;
          meeting_link?: string | null;
          message_notes?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: SessionLifecycleStatus;
          meeting_link?: string | null;
          message_notes?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      session_confirmations: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          role: 'teacher' | 'learner';
          confirmed_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          role: 'teacher' | 'learner';
          confirmed_at?: string;
        };
        Update: never;
      };
      credit_ledger: {
        Row: {
          id: string;
          entry_type: CreditLedgerEntryType;
          source_wallet_id: string | null;
          destination_wallet_id: string | null;
          session_id: string | null;
          amount: number;
          idempotency_key: string;
          notes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          entry_type: CreditLedgerEntryType;
          source_wallet_id?: string | null;
          destination_wallet_id?: string | null;
          session_id?: string | null;
          amount: number;
          idempotency_key: string;
          notes: string;
          created_at?: string;
        };
        Update: never;
      };
      conversations: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          updated_at?: string;
        };
      };
      conversation_members: {
        Row: {
          conversation_id: string;
          profile_id: string;
          last_read_at: string;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          profile_id: string;
          last_read_at?: string;
          created_at?: string;
        };
        Update: {
          last_read_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          is_proposal: boolean;
          proposal_details: Json | null;
          client_message_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          is_proposal?: boolean;
          proposal_details?: Json | null;
          client_message_id?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          action_url: string;
          credit_impact: number | null;
          is_read: boolean;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string;
          action_url?: string;
          credit_impact?: number | null;
          is_read?: boolean;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      reviews: {
        Row: {
          id: string;
          session_id: string;
          author_id: string;
          recipient_id: string;
          rating: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          author_id: string;
          recipient_id: string;
          rating: number;
          comment: string;
          created_at?: string;
        };
        Update: never;
      };
    };
    Functions: {
      get_or_create_conversation: {
        Args: {
          p_recipient_id: string;
        };
        Returns: string;
      };
      send_message: {
        Args: {
          p_conversation_id: string;
          p_body: string;
          p_is_proposal?: boolean;
          p_proposal_details?: Json | null;
          p_client_message_id?: string | null;
        };
        Returns: Json;
      };
      mark_conversation_read: {
        Args: {
          p_conversation_id: string;
        };
        Returns: boolean;
      };
      mark_notification_read: {
        Args: {
          p_notification_id: string;
        };
        Returns: boolean;
      };
      mark_all_notifications_read: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_conversation_unread_count: {
        Args: {
          p_conversation_id: string;
        };
        Returns: number;
      };
      create_session_request: {
        Args: {
          p_teacher_id: string;
          p_skill_id?: string | null;
          p_skill_title: string;
          p_category: string;
          p_learning_goal: string;
          p_duration_minutes: number;
          p_scheduled_start_at: string;
          p_message_notes?: string | null;
          p_idempotency_key: string;
        };
        Returns: Json;
      };
      accept_session_request: {
        Args: {
          p_session_id: string;
        };
        Returns: Json;
      };
      decline_session_request: {
        Args: {
          p_session_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      cancel_session: {
        Args: {
          p_session_id: string;
          p_reason?: string;
        };
        Returns: Json;
      };
      confirm_session_completion: {
        Args: {
          p_session_id: string;
          p_role: 'teacher' | 'learner';
        };
        Returns: Json;
      };
    };
  };
}
