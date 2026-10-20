-- ==============================================================================
-- TimeSwap Migration: 20261020000002_rls_policies.sql
-- Description: Row Level Security (RLS) Policies & Authorization Boundaries
-- Phase: Phase 1 (Backend Foundation)
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL APPLICATION TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. POLICIES: profiles
-- Public discovery for members; private update restricted to account owner.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
CREATE POLICY "profiles_select_public"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 3. POLICIES: skills
-- Global directory readable by everyone; mutations denied to regular clients.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "skills_select_all" ON public.skills;
CREATE POLICY "skills_select_all"
ON public.skills FOR SELECT
USING (true);

-- ------------------------------------------------------------------------------
-- 4. POLICIES: member_skills
-- Public read for skill listings; mutations restricted to skill owner.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "member_skills_select_public" ON public.member_skills;
CREATE POLICY "member_skills_select_public"
ON public.member_skills FOR SELECT
USING (true);

DROP POLICY IF EXISTS "member_skills_insert_own" ON public.member_skills;
CREATE POLICY "member_skills_insert_own"
ON public.member_skills FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "member_skills_update_own" ON public.member_skills;
CREATE POLICY "member_skills_update_own"
ON public.member_skills FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "member_skills_delete_own" ON public.member_skills;
CREATE POLICY "member_skills_delete_own"
ON public.member_skills FOR DELETE
USING (auth.uid() = profile_id);

-- ------------------------------------------------------------------------------
-- 5. POLICIES: availability_slots
-- Public read for calendar slots; mutations restricted to slot owner.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "availability_slots_select_public" ON public.availability_slots;
CREATE POLICY "availability_slots_select_public"
ON public.availability_slots FOR SELECT
USING (true);

DROP POLICY IF EXISTS "availability_slots_insert_own" ON public.availability_slots;
CREATE POLICY "availability_slots_insert_own"
ON public.availability_slots FOR INSERT
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "availability_slots_update_own" ON public.availability_slots;
CREATE POLICY "availability_slots_update_own"
ON public.availability_slots FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "availability_slots_delete_own" ON public.availability_slots;
CREATE POLICY "availability_slots_delete_own"
ON public.availability_slots FOR DELETE
USING (auth.uid() = profile_id);

-- ------------------------------------------------------------------------------
-- 6. POLICIES: saved_members
-- Strictly private bookmarks: only owner can view, create, or delete.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "saved_members_select_own" ON public.saved_members;
CREATE POLICY "saved_members_select_own"
ON public.saved_members FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_members_insert_own" ON public.saved_members;
CREATE POLICY "saved_members_insert_own"
ON public.saved_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_members_delete_own" ON public.saved_members;
CREATE POLICY "saved_members_delete_own"
ON public.saved_members FOR DELETE
USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. POLICIES: credit_wallets
-- Strictly Private Read-Only for account owners.
-- DIRECT CLIENT MUTATIONS (INSERT, UPDATE, DELETE) ARE EXPLICITLY FORBIDDEN!
-- Balances may only be updated via trusted SECURITY DEFINER functions.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "credit_wallets_select_own" ON public.credit_wallets;
CREATE POLICY "credit_wallets_select_own"
ON public.credit_wallets FOR SELECT
USING (auth.uid() = profile_id);

-- Note: No INSERT/UPDATE/DELETE policies defined for credit_wallets.
-- RLS default is DENY for any role not matching a policy.

-- ------------------------------------------------------------------------------
-- 8. POLICIES: credit_ledger
-- Strictly Private Read-Only for transaction counterparties.
-- DIRECT CLIENT WRITES ARE EXPLICITLY FORBIDDEN!
-- Only trusted backend procedures can insert into the immutable ledger.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "credit_ledger_select_participants" ON public.credit_ledger;
CREATE POLICY "credit_ledger_select_participants"
ON public.credit_ledger FOR SELECT
USING (
    auth.uid() = source_wallet_id OR 
    auth.uid() = destination_wallet_id
);

-- Note: No INSERT/UPDATE/DELETE policies defined for credit_ledger.

-- ------------------------------------------------------------------------------
-- 9. POLICIES: sessions
-- Sessions visible ONLY to authorized participants (teacher or learner).
-- Direct client insertions are denied by default until Phase 3 escrow RPCs.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "sessions_select_participants" ON public.sessions;
CREATE POLICY "sessions_select_participants"
ON public.sessions FOR SELECT
USING (
    auth.uid() = teacher_id OR 
    auth.uid() = learner_id
);

-- Note: In Phase 1, sessions are created exclusively via the trusted booking function in Phase 3.
-- Deny-by-default applies for client INSERT/DELETE.

-- ------------------------------------------------------------------------------
-- 10. POLICIES: session_confirmations
-- Confirmations visible only to session participants.
-- A participant can insert their own confirmation for an active session.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "session_confirmations_select_participants" ON public.session_confirmations;
CREATE POLICY "session_confirmations_select_participants"
ON public.session_confirmations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_confirmations.session_id
          AND (s.teacher_id = auth.uid() OR s.learner_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "session_confirmations_insert_participant" ON public.session_confirmations;
CREATE POLICY "session_confirmations_insert_participant"
ON public.session_confirmations FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_confirmations.session_id
          AND (
            (session_confirmations.role = 'teacher' AND s.teacher_id = auth.uid()) OR
            (session_confirmations.role = 'learner' AND s.learner_id = auth.uid())
          )
          AND s.status IN ('accepted', 'in_progress', 'awaiting_completion')
    )
);

-- ------------------------------------------------------------------------------
-- 11. POLICIES: conversations & conversation_members
-- Authorized conversation members ONLY.
-- Uses SECURITY DEFINER helper to prevent infinite recursion in junction RLS.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.conversation_members
        WHERE conversation_id = p_conversation_id
          AND profile_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql;

DROP POLICY IF EXISTS "conversations_select_members" ON public.conversations;
CREATE POLICY "conversations_select_members"
ON public.conversations FOR SELECT
USING (
    public.fn_is_conversation_member(id, auth.uid())
);

DROP POLICY IF EXISTS "conversation_members_select_own_or_peers" ON public.conversation_members;
CREATE POLICY "conversation_members_select_own_or_peers"
ON public.conversation_members FOR SELECT
USING (
    profile_id = auth.uid() OR
    public.fn_is_conversation_member(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "conversation_members_insert_member" ON public.conversation_members;
CREATE POLICY "conversation_members_insert_member"
ON public.conversation_members FOR INSERT
WITH CHECK (
    auth.uid() = profile_id OR
    public.fn_is_conversation_member(conversation_id, auth.uid())
);

-- ------------------------------------------------------------------------------
-- 12. POLICIES: messages
-- Visible only to verified conversation members; senders can insert to conversations they belong to.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "messages_select_members" ON public.messages;
CREATE POLICY "messages_select_members"
ON public.messages FOR SELECT
USING (
    public.fn_is_conversation_member(conversation_id, auth.uid())
);

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender"
ON public.messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id AND
    public.fn_is_conversation_member(conversation_id, auth.uid())
);

-- ------------------------------------------------------------------------------
-- 13. POLICIES: notifications
-- Strictly private to recipient.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 14. POLICIES: reviews
-- Public read for member testimonials; insert restricted to session participants.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "reviews_select_public" ON public.reviews;
CREATE POLICY "reviews_select_public"
ON public.reviews FOR SELECT
USING (true);

DROP POLICY IF EXISTS "reviews_insert_participant" ON public.reviews;
CREATE POLICY "reviews_insert_participant"
ON public.reviews FOR INSERT
WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = reviews.session_id
          AND s.status = 'completed'
          AND (s.teacher_id = auth.uid() OR s.learner_id = auth.uid())
    )
);
