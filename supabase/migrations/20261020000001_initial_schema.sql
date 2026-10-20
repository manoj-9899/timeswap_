-- ==============================================================================
-- TimeSwap Migration: 20261020000001_initial_schema.sql
-- Description: Core Relational Schema, Constraints, Indexes & Accounting Invariants
-- Phase: Phase 1 (Backend Foundation)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure auth schema exists (standard in Supabase)
CREATE SCHEMA IF NOT EXISTS auth;

-- 2. ENUM & TAXONOMY VALIDATION DOMAINS
-- Note: PostgreSQL CHECK constraints are used for strict portability and clear error messaging.

-- ------------------------------------------------------------------------------
-- Table 1: profiles
-- Public directory profile combined with private notification preferences.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    handle TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    headline TEXT,
    bio TEXT,
    location TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    review_count INTEGER NOT NULL DEFAULT 0,
    hours_taught INTEGER NOT NULL DEFAULT 0,
    hours_learned INTEGER NOT NULL DEFAULT 0,
    notification_preferences JSONB NOT NULL DEFAULT '{"email_alerts":true,"session_reminders":true,"credit_updates":true,"community_digest":false}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_profiles_handle_format CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
    CONSTRAINT chk_profiles_name_length CHECK (char_length(trim(name)) >= 2),
    CONSTRAINT chk_profiles_rating_range CHECK (rating >= 1.00 AND rating <= 5.00),
    CONSTRAINT chk_profiles_hours_taught_non_negative CHECK (hours_taught >= 0),
    CONSTRAINT chk_profiles_hours_learned_non_negative CHECK (hours_learned >= 0),
    CONSTRAINT chk_profiles_review_count_non_negative CHECK (review_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_profiles_handle ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);

-- ------------------------------------------------------------------------------
-- Table 2: skills
-- Global taxonomy of learnable and teachable topics.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_skills_name_length CHECK (char_length(trim(name)) >= 2),
    CONSTRAINT chk_skills_category CHECK (category IN (
        'Design & Creative',
        'Code & Technology',
        'Languages & Writing',
        'Crafts & Hands-on',
        'Music & Sound',
        'Wellness & Lifestyle',
        'Business & Strategy'
    ))
);

CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);

-- ------------------------------------------------------------------------------
-- Table 3: member_skills
-- Junction table: skills offered by a mentor with proficiency and syllabus details.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.member_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE RESTRICT,
    proficiency TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_member_skills_profile_skill UNIQUE (profile_id, skill_id),
    CONSTRAINT chk_member_skills_proficiency CHECK (proficiency IN ('Beginner', 'Intermediate', 'Advanced', 'Master'))
);

CREATE INDEX IF NOT EXISTS idx_member_skills_profile ON public.member_skills(profile_id);
CREATE INDEX IF NOT EXISTS idx_member_skills_skill ON public.member_skills(skill_id);

-- ------------------------------------------------------------------------------
-- Table 4: availability_slots
-- Recurring weekly mentorship availability blocks.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    preferred_cadence TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_availability_day_of_week CHECK (day_of_week BETWEEN 0 AND 6),
    CONSTRAINT chk_availability_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_slots_profile ON public.availability_slots(profile_id);

-- ------------------------------------------------------------------------------
-- Table 5: saved_members
-- User bookmarks / wishlists for mentors.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_members (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    saved_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, saved_profile_id),
    CONSTRAINT chk_saved_members_not_self CHECK (user_id != saved_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_members_user ON public.saved_members(user_id);

-- ------------------------------------------------------------------------------
-- Table 6: credit_wallets
-- Operational materialized balances for user time-credit accounts.
-- STRICT INVARIANT: Always reconcilable against public.credit_ledger.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_wallets (
    profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    available_balance INTEGER NOT NULL DEFAULT 0,
    escrow_balance INTEGER NOT NULL DEFAULT 0,
    lifetime_earned INTEGER NOT NULL DEFAULT 0,
    lifetime_spent INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Invariants: Integer non-negative balances
    CONSTRAINT chk_wallets_available_non_negative CHECK (available_balance >= 0),
    CONSTRAINT chk_wallets_escrow_non_negative CHECK (escrow_balance >= 0),
    CONSTRAINT chk_wallets_lifetime_earned_non_negative CHECK (lifetime_earned >= 0),
    CONSTRAINT chk_wallets_lifetime_spent_non_negative CHECK (lifetime_spent >= 0)
);

-- ------------------------------------------------------------------------------
-- Table 7: sessions
-- Exchange contracts between learner and teacher.
-- STRICT PRODUCT RULES:
-- 1. Duration must be exactly 60, 120, or 180 minutes.
-- 2. Credit cost must equal duration_minutes / 60 (1, 2, or 3 whole credits).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    learner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
    skill_title TEXT NOT NULL,
    category TEXT NOT NULL,
    learning_goal TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    credit_cost INTEGER NOT NULL,
    scheduled_start_at TIMESTAMPTZ NOT NULL,
    scheduled_end_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'requested',
    meeting_link TEXT,
    message_notes TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_sessions_distinct_participants CHECK (teacher_id != learner_id),
    CONSTRAINT chk_sessions_skill_title_length CHECK (char_length(trim(skill_title)) >= 2),
    CONSTRAINT chk_sessions_learning_goal_length CHECK (char_length(trim(learning_goal)) >= 3),
    -- Non-Negotiable: Whole-Number Durations (60, 120, 180 min)
    CONSTRAINT chk_sessions_allowed_durations CHECK (duration_minutes IN (60, 120, 180)),
    -- Non-Negotiable: Integer Credit Cost Formula (cost = duration / 60)
    CONSTRAINT chk_sessions_credit_cost_match CHECK (
        credit_cost = (duration_minutes / 60) AND credit_cost IN (1, 2, 3)
    ),
    CONSTRAINT chk_sessions_time_chronology CHECK (scheduled_start_at < scheduled_end_at),
    -- Category validation
    CONSTRAINT chk_sessions_category CHECK (category IN (
        'Design & Creative',
        'Code & Technology',
        'Languages & Writing',
        'Crafts & Hands-on',
        'Music & Sound',
        'Wellness & Lifestyle',
        'Business & Strategy'
    )),
    -- Distinct lifecycle states (No overloaded 'pending' state!)
    CONSTRAINT chk_sessions_lifecycle_status CHECK (status IN (
        'requested',
        'accepted',
        'declined',
        'cancelled_by_learner',
        'cancelled_by_teacher',
        'in_progress',
        'awaiting_completion',
        'completed',
        'under_review'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sessions_teacher_status ON public.sessions(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_learner_status ON public.sessions(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON public.sessions(scheduled_start_at);

-- ------------------------------------------------------------------------------
-- Table 8: session_confirmations
-- Independent bilateral verification records.
-- Each party confirms independently; exactly one confirmation per role per session.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    role TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_session_confirmations_role CHECK (role IN ('teacher', 'learner')),
    CONSTRAINT uq_session_confirmations_user_session UNIQUE (session_id, user_id),
    CONSTRAINT uq_session_confirmations_role_session UNIQUE (session_id, role)
);

CREATE INDEX IF NOT EXISTS idx_session_confirmations_session ON public.session_confirmations(session_id);

-- ------------------------------------------------------------------------------
-- Table 9: credit_ledger
-- Authoritative, append-only, double-entry transaction journal.
-- STRICT INVARIANTS:
-- 1. Fractional credits are rejected.
-- 2. Records cannot be updated or deleted after insert.
-- 3. Idempotency key strictly prevents duplicate operations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type TEXT NOT NULL,
    source_wallet_id UUID REFERENCES public.credit_wallets(profile_id) ON DELETE RESTRICT,
    destination_wallet_id UUID REFERENCES public.credit_wallets(profile_id) ON DELETE RESTRICT,
    session_id UUID REFERENCES public.sessions(id) ON DELETE RESTRICT,
    amount INTEGER NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    notes TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT chk_ledger_entry_type CHECK (entry_type IN (
        'welcome_grant',                -- 3 credits granted upon verified email registration
        'escrow_hold',                  -- Learner available -> escrow upon booking
        'escrow_release_earned',        -- Learner escrow -> Teacher available upon bilateral completion
        'escrow_refund',                -- Learner escrow -> Learner available upon cancellation / decline
        'escrow_cancellation_transfer', -- Learner escrow -> Teacher available upon late cancellation
        'admin_adjustment'              -- Stewardship dispute resolution
    )),
    -- Non-Negotiable: Positive Integer Amount (1, 2, or 3 credits)
    CONSTRAINT chk_ledger_positive_integer_amount CHECK (amount > 0 AND amount IN (1, 2, 3)),
    -- Accounting Integrity: Source and Destination rules per entry type
    CONSTRAINT chk_ledger_accounting_integrity CHECK (
        (entry_type = 'welcome_grant' AND source_wallet_id IS NULL AND destination_wallet_id IS NOT NULL AND amount = 3) OR
        (entry_type = 'escrow_hold' AND source_wallet_id IS NOT NULL AND destination_wallet_id IS NULL AND session_id IS NOT NULL) OR
        (entry_type = 'escrow_release_earned' AND source_wallet_id IS NOT NULL AND destination_wallet_id IS NOT NULL AND session_id IS NOT NULL) OR
        (entry_type = 'escrow_refund' AND source_wallet_id IS NOT NULL AND destination_wallet_id IS NOT NULL AND session_id IS NOT NULL) OR
        (entry_type = 'escrow_cancellation_transfer' AND source_wallet_id IS NOT NULL AND destination_wallet_id IS NOT NULL AND session_id IS NOT NULL) OR
        (entry_type = 'admin_adjustment' AND (source_wallet_id IS NOT NULL OR destination_wallet_id IS NOT NULL))
    )
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_source ON public.credit_ledger(source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_destination ON public.credit_ledger(destination_wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_session ON public.credit_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created ON public.credit_ledger(created_at DESC);

-- Trigger: Enforce Immutability of Credit Ledger (Disallow UPDATE & DELETE)
CREATE OR REPLACE FUNCTION public.fn_enforce_credit_ledger_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Posted credit_ledger records are immutable and cannot be updated or deleted.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_credit_ledger_immutability ON public.credit_ledger;
CREATE TRIGGER trg_credit_ledger_immutability
BEFORE UPDATE OR DELETE ON public.credit_ledger
FOR EACH ROW
EXECUTE FUNCTION public.fn_enforce_credit_ledger_immutability();

-- ------------------------------------------------------------------------------
-- Table 10: conversations & Table 11: conversation_members
-- Multi-party messaging containers with explicit participant authorization.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (conversation_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_members_profile ON public.conversation_members(profile_id);

-- ------------------------------------------------------------------------------
-- Table 12: messages
-- Direct messages tied to verified conversations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    is_proposal BOOLEAN NOT NULL DEFAULT false,
    proposal_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_messages_body_not_empty CHECK (char_length(trim(body)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- ------------------------------------------------------------------------------
-- Table 13: notifications
-- Private user alerts for requests, confirmations, and credit impacts.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_url TEXT NOT NULL DEFAULT '/',
    credit_impact INTEGER,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_notifications_type CHECK (type IN (
        'welcome',
        'session_request',
        'session_accepted',
        'session_declined',
        'session_cancelled',
        'completion_pending',
        'credit_transfer',
        'dispute_flagged',
        'message',
        'community'
    )),
    CONSTRAINT chk_notifications_credit_impact CHECK (
        credit_impact IS NULL OR credit_impact IN (-3, -2, -1, 1, 2, 3)
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- ------------------------------------------------------------------------------
-- Table 14: reviews
-- Verified peer reviews: exactly one review per participant per completed session.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rating SMALLINT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_reviews_session_author UNIQUE (session_id, author_id),
    CONSTRAINT chk_reviews_distinct_parties CHECK (author_id != recipient_id),
    CONSTRAINT chk_reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_reviews_comment_length CHECK (char_length(trim(comment)) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_reviews_recipient ON public.reviews(recipient_id);
CREATE INDEX IF NOT EXISTS idx_reviews_session ON public.reviews(session_id);
