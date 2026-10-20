-- ==============================================================================
-- TimeSwap Migration: Phase 4
-- 20261020000006_phase4_realtime_messaging_notifications.sql
-- 
-- Implements:
-- 1. Conversation members UPDATE policy for last_read_at
-- 2. Message and notification idempotency columns
-- 3. get_or_create_conversation RPC
-- 4. send_message RPC with automated notification and unread tracking
-- 5. mark_conversation_read, mark_notification_read, and mark_all_notifications_read RPCs
-- 6. Supabase Realtime publication configuration for messages, notifications, and members
-- ==============================================================================

-- 1. Add idempotency and client tracking columns
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS client_message_id TEXT UNIQUE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- 2. RLS policy allowing members to update their own read state in conversation_members
DROP POLICY IF EXISTS "conversation_members_update_own" ON public.conversation_members;
CREATE POLICY "conversation_members_update_own"
ON public.conversation_members FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- ------------------------------------------------------------------------------
-- RPC 1: get_or_create_conversation
-- Looks up existing 1-on-1 conversation between authenticated caller and recipient,
-- or creates a new conversation with membership rows atomically.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
    p_recipient_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_conv_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    IF v_caller_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot create conversation with yourself.';
    END IF;

    -- Verify recipient profile exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_recipient_id) THEN
        RAISE EXCEPTION 'Recipient member does not exist.';
    END IF;

    -- Find existing 1-on-1 conversation
    SELECT cm1.conversation_id INTO v_conv_id
    FROM public.conversation_members cm1
    JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
    WHERE cm1.profile_id = v_caller_id
      AND cm2.profile_id = p_recipient_id
    LIMIT 1;

    IF v_conv_id IS NOT NULL THEN
        RETURN v_conv_id;
    END IF;

    -- Create new conversation container
    v_conv_id := gen_random_uuid();
    INSERT INTO public.conversations (id, created_at, updated_at)
    VALUES (v_conv_id, now(), now());

    -- Insert membership for both participants
    INSERT INTO public.conversation_members (conversation_id, profile_id, last_read_at, created_at)
    VALUES 
        (v_conv_id, v_caller_id, now(), now()),
        (v_conv_id, p_recipient_id, now() - interval '1 hour', now());

    RETURN v_conv_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 2: send_message
-- Persists message, updates conversation activity, advances sender read position,
-- and creates an in-app notification for the counterparty.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.send_message(
    p_conversation_id UUID,
    p_body TEXT,
    p_is_proposal BOOLEAN DEFAULT false,
    p_proposal_details JSONB DEFAULT NULL,
    p_client_message_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_sender_name TEXT;
    v_msg_id UUID;
    v_existing JSONB;
    v_result JSONB;
    v_peer RECORD;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Validate conversation membership
    IF NOT public.fn_is_conversation_member(p_conversation_id, v_caller_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not a participant in this conversation.';
    END IF;

    -- Validate message body
    IF char_length(trim(p_body)) = 0 OR char_length(p_body) > 5000 THEN
        RAISE EXCEPTION 'Message body must be between 1 and 5000 characters.';
    END IF;

    -- Idempotency check on client_message_id
    IF p_client_message_id IS NOT NULL THEN
        SELECT to_jsonb(m.*) INTO v_existing
        FROM public.messages m
        WHERE client_message_id = p_client_message_id;

        IF v_existing IS NOT NULL THEN
            RETURN v_existing;
        END IF;
    END IF;

    -- Insert message
    v_msg_id := gen_random_uuid();
    INSERT INTO public.messages (
        id, conversation_id, sender_id, body, is_proposal, proposal_details, client_message_id, created_at
    ) VALUES (
        v_msg_id, p_conversation_id, v_caller_id, p_body, p_is_proposal, p_proposal_details, p_client_message_id, now()
    );

    -- Update conversation timestamp for sorting
    UPDATE public.conversations
    SET updated_at = now()
    WHERE id = p_conversation_id;

    -- Advance sender's last_read_at
    UPDATE public.conversation_members
    SET last_read_at = now()
    WHERE conversation_id = p_conversation_id AND profile_id = v_caller_id;

    -- Notify recipient(s)
    SELECT name INTO v_sender_name FROM public.profiles WHERE id = v_caller_id;

    FOR v_peer IN
        SELECT profile_id FROM public.conversation_members
        WHERE conversation_id = p_conversation_id AND profile_id != v_caller_id
    LOOP
        INSERT INTO public.notifications (
            user_id, type, title, body, action_url, idempotency_key
        ) VALUES (
            v_peer.profile_id,
            'message',
            'New message from ' || COALESCE(v_sender_name, 'Exchange Partner'),
            CASE WHEN char_length(p_body) > 80 THEN substring(p_body from 1 for 77) || '...' ELSE p_body END,
            '/messages?id=' || p_conversation_id,
            COALESCE(p_client_message_id, 'msg_notif_' || v_msg_id)
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END LOOP;

    SELECT to_jsonb(m.*) INTO v_result
    FROM public.messages m WHERE m.id = v_msg_id;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 3: mark_conversation_read
-- Updates caller's last_read_at in conversation_members and marks message notifications as read.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_conversation_read(
    p_conversation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    UPDATE public.conversation_members
    SET last_read_at = now()
    WHERE conversation_id = p_conversation_id AND profile_id = v_caller_id;

    -- Mark conversation notifications as read
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = v_caller_id
      AND action_url = '/messages?id=' || p_conversation_id
      AND is_read = false;

    RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 4: mark_notification_read
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_read(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    UPDATE public.notifications
    SET is_read = true
    WHERE id = p_notification_id AND user_id = v_caller_id;

    RETURN true;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 5: mark_all_notifications_read
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_count INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    WITH updated AS (
        UPDATE public.notifications
        SET is_read = true
        WHERE user_id = v_caller_id AND is_read = false
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN v_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 6: get_conversation_unread_count
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_conversation_unread_count(
    p_conversation_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_last_read TIMESTAMPTZ;
    v_unread INTEGER;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT last_read_at INTO v_last_read
    FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND profile_id = v_caller_id;

    IF v_last_read IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_unread
    FROM public.messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_caller_id
      AND created_at > v_last_read;

    RETURN v_unread;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Supabase Realtime Publication Configuration
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members;
    END IF;
END
$$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;

-- ------------------------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION public.get_or_create_conversation TO authenticated;
        GRANT EXECUTE ON FUNCTION public.send_message TO authenticated;
        GRANT EXECUTE ON FUNCTION public.mark_conversation_read TO authenticated;
        GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;
        GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;
        GRANT EXECUTE ON FUNCTION public.get_conversation_unread_count TO authenticated;
    END IF;
END
$$;
