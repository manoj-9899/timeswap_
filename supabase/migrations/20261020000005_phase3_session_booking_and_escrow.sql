-- ==============================================================================
-- TimeSwap Migration: Phase 3
-- 20261020000005_phase3_session_booking_and_escrow.sql
-- 
-- Implements:
-- 1. Lifecycle status constraint update to include 'expired'
-- 2. Atomic session booking with instant whole-number credit escrow hold
-- 3. Mentor request acceptance with expiry checks
-- 4. Mentor request rejection with instant escrow refund
-- 5. Request expiration worker/RPC with automatic escrow refund
-- 6. Cancellation engine (2-hour policy, mentor availability verification, refunds & transfers)
-- 7. Bilateral completion confirmation engine with single-execution settlement
-- 8. 72-hour ghosting/dispute flagging worker (preserves escrow, marks under_review)
-- ==============================================================================

-- 1. Update public.sessions lifecycle status constraint to include 'expired'
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS chk_sessions_lifecycle_status;
ALTER TABLE public.sessions ADD CONSTRAINT chk_sessions_lifecycle_status CHECK (status IN (
    'requested',
    'accepted',
    'declined',
    'expired',
    'cancelled_by_learner',
    'cancelled_by_teacher',
    'in_progress',
    'awaiting_completion',
    'completed',
    'under_review'
));

-- ------------------------------------------------------------------------------
-- RPC 1: create_session_request
-- Atomically validates participants, whole-number duration/cost, locks learner wallet,
-- creates session request, and transfers credits from available to escrow balance.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_session_request(
    p_teacher_id UUID,
    p_skill_id UUID,
    p_skill_title TEXT,
    p_category TEXT,
    p_learning_goal TEXT,
    p_duration_minutes INTEGER,
    p_scheduled_start_at TIMESTAMPTZ,
    p_message_notes TEXT DEFAULT NULL,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_learner_id UUID;
    v_credit_cost INTEGER;
    v_scheduled_end_at TIMESTAMPTZ;
    v_learner_onboarding BOOLEAN;
    v_teacher_onboarding BOOLEAN;
    v_existing_session_id UUID;
    v_avail_balance INTEGER;
    v_escrow_balance INTEGER;
    v_session_id UUID;
    v_effective_idempotency_key TEXT;
    v_result JSONB;
BEGIN
    -- 1. Authenticate caller
    v_learner_id := auth.uid();
    IF v_learner_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to create a session request.';
    END IF;

    -- 2. Reject self-booking
    IF v_learner_id = p_teacher_id THEN
        RAISE EXCEPTION 'Learner and mentor must be different members.';
    END IF;

    -- 3. Validate duration (strictly 60, 120, or 180 minutes)
    IF p_duration_minutes NOT IN (60, 120, 180) THEN
        RAISE EXCEPTION 'Invalid session duration (%). Only 60, 120, and 180 minutes are allowed.', p_duration_minutes;
    END IF;

    -- Whole-number cost formula: 1 hour = 1 credit
    v_credit_cost := p_duration_minutes / 60;

    -- 4. Validate scheduled timing
    IF p_scheduled_start_at <= now() THEN
        RAISE EXCEPTION 'Scheduled session start time must be in the future.';
    END IF;
    v_scheduled_end_at := p_scheduled_start_at + (p_duration_minutes || ' minutes')::interval;

    -- 5. Verify onboarding completion of both parties
    SELECT onboarding_completed INTO v_learner_onboarding
    FROM public.profiles WHERE id = v_learner_id;
    IF v_learner_onboarding IS NOT TRUE THEN
        RAISE EXCEPTION 'Learner must complete mentor onboarding before booking sessions.';
    END IF;

    SELECT onboarding_completed INTO v_teacher_onboarding
    FROM public.profiles WHERE id = p_teacher_id;
    IF v_teacher_onboarding IS NOT TRUE THEN
        RAISE EXCEPTION 'Designated mentor has not completed onboarding or is not active.';
    END IF;

    -- 6. Idempotency Check
    IF p_idempotency_key IS NOT NULL THEN
        SELECT session_id INTO v_existing_session_id
        FROM public.credit_ledger
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_session_id IS NOT NULL THEN
            SELECT to_jsonb(s.*) INTO v_result
            FROM public.sessions s WHERE s.id = v_existing_session_id;
            RETURN v_result;
        END IF;
    END IF;

    -- 7. Atomically lock learner's wallet row and verify available credits
    SELECT available_balance, escrow_balance INTO v_avail_balance, v_escrow_balance
    FROM public.credit_wallets
    WHERE profile_id = v_learner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit wallet not found for user %.', v_learner_id;
    END IF;

    IF v_avail_balance < v_credit_cost THEN
        RAISE EXCEPTION 'Insufficient available time credits. Required: %, Available: %', v_credit_cost, v_avail_balance;
    END IF;

    -- 8. Generate session ID and insert into public.sessions
    v_session_id := gen_random_uuid();
    v_effective_idempotency_key := COALESCE(p_idempotency_key, 'escrow_hold_' || v_session_id);

    INSERT INTO public.sessions (
        id, teacher_id, learner_id, skill_id, skill_title, category,
        learning_goal, duration_minutes, credit_cost,
        scheduled_start_at, scheduled_end_at, status, message_notes
    ) VALUES (
        v_session_id, p_teacher_id, v_learner_id, p_skill_id, p_skill_title, p_category,
        p_learning_goal, p_duration_minutes, v_credit_cost,
        p_scheduled_start_at, v_scheduled_end_at, 'requested', p_message_notes
    );

    -- 9. Atomic reservation from available_balance to escrow_balance
    UPDATE public.credit_wallets
    SET available_balance = available_balance - v_credit_cost,
        escrow_balance = escrow_balance + v_credit_cost,
        updated_at = now()
    WHERE profile_id = v_learner_id;

    -- 10. Record immutable journal entry in public.credit_ledger
    INSERT INTO public.credit_ledger (
        entry_type, source_wallet_id, destination_wallet_id, session_id,
        amount, idempotency_key, notes
    ) VALUES (
        'escrow_hold', v_learner_id, NULL, v_session_id,
        v_credit_cost, v_effective_idempotency_key,
        'Escrow reservation for ' || p_duration_minutes || '-minute session: ' || p_skill_title
    );

    -- 11. Create notification for teacher
    INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
    VALUES (
        p_teacher_id, 'session_request', 'New Session Request',
        'You received a ' || p_duration_minutes || '-minute session request for "' || p_skill_title || '".',
        '/sessions', v_credit_cost
    );

    -- 12. Return created session as JSONB
    SELECT to_jsonb(s.*) INTO v_result
    FROM public.sessions s WHERE s.id = v_session_id;

    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 2: accept_session_request
-- Authorized mentor accepts pending request. Verifies request has not expired.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_session_request(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is designated mentor
    IF v_session.teacher_id != v_caller_id THEN
        RAISE EXCEPTION 'Only the designated mentor can accept this session request.';
    END IF;

    -- Idempotent return if already accepted
    IF v_session.status = 'accepted' THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    IF v_session.status != 'requested' THEN
        RAISE EXCEPTION 'Cannot accept session in status "%".', v_session.status;
    END IF;

    -- Check expiry threshold: within 2h of start or 48h after creation
    IF now() >= v_session.scheduled_start_at - interval '2 hours' OR now() >= v_session.created_at + interval '48 hours' THEN
        RAISE EXCEPTION 'Session request has expired and can no longer be accepted.';
    END IF;

    -- Update session status to accepted
    UPDATE public.sessions
    SET status = 'accepted',
        meeting_link = COALESCE(meeting_link, 'https://meet.timeswap.org/room/' || v_session.id),
        updated_at = now()
    WHERE id = p_session_id;

    -- Notify learner
    INSERT INTO public.notifications (user_id, type, title, body, action_url)
    VALUES (
        v_session.learner_id, 'session_accepted', 'Session Request Accepted!',
        'Your request for "' || v_session.skill_title || '" has been accepted.',
        '/sessions'
    );

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 3: decline_session_request
-- Authorized mentor declines request. Releases escrow reservation back to learner.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decline_session_request(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is designated mentor
    IF v_session.teacher_id != v_caller_id THEN
        RAISE EXCEPTION 'Only the designated mentor can decline this session request.';
    END IF;

    -- Idempotent return if already declined
    IF v_session.status = 'declined' THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    IF v_session.status != 'requested' THEN
        RAISE EXCEPTION 'Cannot decline session in status "%".', v_session.status;
    END IF;

    -- Atomically refund learner wallet from escrow to available
    UPDATE public.credit_wallets
    SET available_balance = available_balance + v_session.credit_cost,
        escrow_balance = escrow_balance - v_session.credit_cost,
        updated_at = now()
    WHERE profile_id = v_session.learner_id;

    -- Record immutable ledger refund entry
    INSERT INTO public.credit_ledger (
        entry_type, source_wallet_id, destination_wallet_id, session_id,
        amount, idempotency_key, notes
    ) VALUES (
        'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
        v_session.credit_cost, 'escrow_refund_decline_' || v_session.id,
        'Full refund of ' || v_session.credit_cost || ' credit(s): mentor declined session request.'
    );

    -- Update session status
    UPDATE public.sessions
    SET status = 'declined',
        cancellation_reason = p_reason,
        updated_at = now()
    WHERE id = p_session_id;

    -- Notify learner
    INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
    VALUES (
        v_session.learner_id, 'session_declined', 'Session Request Declined',
        'Your request for "' || v_session.skill_title || '" was declined. ' || v_session.credit_cost || ' credit(s) restored to your available wallet.',
        '/wallet', v_session.credit_cost
    );

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 4: expire_session_request
-- Releases reservation and marks request expired when response cutoff is passed.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_session_request(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_session public.sessions%ROWTYPE;
    v_result JSONB;
BEGIN
    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Idempotent return if already expired
    IF v_session.status = 'expired' THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    IF v_session.status != 'requested' THEN
        RAISE EXCEPTION 'Cannot expire session in status "%".', v_session.status;
    END IF;

    -- Release escrow reservation back to learner available balance
    UPDATE public.credit_wallets
    SET available_balance = available_balance + v_session.credit_cost,
        escrow_balance = escrow_balance - v_session.credit_cost,
        updated_at = now()
    WHERE profile_id = v_session.learner_id;

    -- Ledger entry for expiry refund
    INSERT INTO public.credit_ledger (
        entry_type, source_wallet_id, destination_wallet_id, session_id,
        amount, idempotency_key, notes
    ) VALUES (
        'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
        v_session.credit_cost, 'escrow_refund_expired_' || v_session.id,
        'Automatic refund: session request expired without mentor response.'
    );

    -- Mark session expired
    UPDATE public.sessions
    SET status = 'expired',
        cancellation_reason = 'Request expired without response within allowed response window.',
        updated_at = now()
    WHERE id = p_session_id;

    -- Notify learner
    INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
    VALUES (
        v_session.learner_id, 'session_cancelled', 'Session Request Expired',
        'Your request for "' || v_session.skill_title || '" expired. ' || v_session.credit_cost || ' credit(s) restored to your available wallet.',
        '/wallet', v_session.credit_cost
    );

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 5: cancel_session
-- Enforces authoritative 2-hour cancellation policy:
-- - Mentor cancellation: Full refund to learner always.
-- - Learner > 2 hours before start: Full refund to learner.
-- - Learner <= 2 hours before start:
--     * If mentor was available: Transfer credits to mentor as compensation.
--     * If mentor was not available: Route to 'under_review' (do not auto-pay mentor).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_session(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL,
    p_mentor_was_available BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_is_early BOOLEAN;
    v_mentor_available BOOLEAN;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is a session participant
    IF v_caller_id != v_session.learner_id AND v_caller_id != v_session.teacher_id THEN
        RAISE EXCEPTION 'Unauthorized: Only participants can cancel a session.';
    END IF;

    -- Check if already cancelled
    IF v_session.status IN ('cancelled_by_learner', 'cancelled_by_teacher') THEN
        SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
        RETURN v_result;
    END IF;

    -- Only allow cancellation for active/pending states
    IF v_session.status NOT IN ('requested', 'accepted', 'in_progress') THEN
        RAISE EXCEPTION 'Cannot cancel session in status "%".', v_session.status;
    END IF;

    -- Check timing (> 2 hours before scheduled start)
    v_is_early := (now() < (v_session.scheduled_start_at - interval '2 hours'));

    IF v_caller_id = v_session.teacher_id THEN
        -- Case 1: Mentor initiates cancellation -> Full refund to learner
        UPDATE public.credit_wallets
        SET available_balance = available_balance + v_session.credit_cost,
            escrow_balance = escrow_balance - v_session.credit_cost,
            updated_at = now()
        WHERE profile_id = v_session.learner_id;

        INSERT INTO public.credit_ledger (
            entry_type, source_wallet_id, destination_wallet_id, session_id,
            amount, idempotency_key, notes
        ) VALUES (
            'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
            v_session.credit_cost, 'escrow_refund_mentor_cancel_' || v_session.id,
            'Full refund of ' || v_session.credit_cost || ' credit(s): mentor cancelled session.'
        );

        UPDATE public.sessions
        SET status = 'cancelled_by_teacher',
            cancellation_reason = p_reason,
            updated_at = now()
        WHERE id = p_session_id;

        INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
        VALUES (
            v_session.learner_id, 'session_cancelled', 'Mentor Cancelled Session',
            'Your mentor cancelled the session. ' || v_session.credit_cost || ' credit(s) have been returned to your wallet.',
            '/wallet', v_session.credit_cost
        );

    ELSIF v_is_early THEN
        -- Case 2: Learner cancels early (> 2h before start) -> Full refund to learner
        UPDATE public.credit_wallets
        SET available_balance = available_balance + v_session.credit_cost,
            escrow_balance = escrow_balance - v_session.credit_cost,
            updated_at = now()
        WHERE profile_id = v_session.learner_id;

        INSERT INTO public.credit_ledger (
            entry_type, source_wallet_id, destination_wallet_id, session_id,
            amount, idempotency_key, notes
        ) VALUES (
            'escrow_refund', v_session.learner_id, v_session.learner_id, v_session.id,
            v_session.credit_cost, 'escrow_refund_learner_early_cancel_' || v_session.id,
            'Full refund of ' || v_session.credit_cost || ' credit(s): learner cancelled more than 2 hours in advance.'
        );

        UPDATE public.sessions
        SET status = 'cancelled_by_learner',
            cancellation_reason = p_reason,
            updated_at = now()
        WHERE id = p_session_id;

        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_session.teacher_id, 'session_cancelled', 'Learner Cancelled Session',
            'The learner cancelled their session scheduled for ' || to_char(v_session.scheduled_start_at, 'YYYY-MM-DD HH24:MI') || '.',
            '/sessions'
        );

    ELSE
        -- Case 3: Learner cancels late (<= 2h before start)
        -- Authoritative database check: Was the mentor available?
        IF p_mentor_was_available IS NOT NULL THEN
            v_mentor_available := p_mentor_was_available;
        ELSE
            -- Authoritative check: verify matching active availability slot or confirmed acceptance
            SELECT EXISTS (
                SELECT 1 FROM public.availability_slots
                WHERE profile_id = v_session.teacher_id
                  AND day_of_week = EXTRACT(DOW FROM v_session.scheduled_start_at AT TIME ZONE 'UTC')
                  AND start_time <= (v_session.scheduled_start_at AT TIME ZONE 'UTC')::time
                  AND end_time >= (v_session.scheduled_end_at AT TIME ZONE 'UTC')::time
            ) OR (v_session.status = 'accepted') INTO v_mentor_available;
        END IF;

        IF v_mentor_available THEN
            -- Mentor was available: Transfer reserved credits to mentor as compensation
            UPDATE public.credit_wallets
            SET escrow_balance = escrow_balance - v_session.credit_cost,
                lifetime_spent = lifetime_spent + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.learner_id;

            UPDATE public.credit_wallets
            SET available_balance = available_balance + v_session.credit_cost,
                lifetime_earned = lifetime_earned + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.teacher_id;

            INSERT INTO public.credit_ledger (
                entry_type, source_wallet_id, destination_wallet_id, session_id,
                amount, idempotency_key, notes
            ) VALUES (
                'escrow_cancellation_transfer', v_session.learner_id, v_session.teacher_id, v_session.id,
                v_session.credit_cost, 'escrow_cancellation_transfer_' || v_session.id,
                'Compensation transfer: Learner cancelled within 2 hours of scheduled start.'
            );

            UPDATE public.sessions
            SET status = 'cancelled_by_learner',
                cancellation_reason = COALESCE(p_reason, 'Late learner cancellation (within 2h). Credits transferred to available mentor.'),
                updated_at = now()
            WHERE id = p_session_id;

            INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
            VALUES (
                v_session.teacher_id, 'credit_transfer', 'Cancellation Compensation Received',
                'Learner cancelled within 2 hours. ' || v_session.credit_cost || ' credit(s) transferred to your wallet.',
                '/wallet', v_session.credit_cost
            );
        ELSE
            -- Mentor was NOT available: Do NOT auto-pay mentor. Route to under_review.
            UPDATE public.sessions
            SET status = 'under_review',
                cancellation_reason = 'Late learner cancellation while mentor was not verified available. Preserved in escrow for stewardship review.',
                updated_at = now()
            WHERE id = p_session_id;

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.learner_id, 'dispute_flagged', 'Session Placed Under Review',
                'Late cancellation occurred while mentor availability was unverified. Credits remain securely in escrow awaiting stewardship review.',
                '/sessions'
            );

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.teacher_id, 'dispute_flagged', 'Session Placed Under Review',
                'A late learner cancellation was received, but your calendar availability was unverified. Case is under community review.',
                '/sessions'
            );
        END IF;
    END IF;

    SELECT to_jsonb(s.*) INTO v_result FROM public.sessions s WHERE s.id = p_session_id;
    RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 6: confirm_session_completion
-- Records independent bilateral confirmation from caller.
-- When BOTH participants confirm, settles escrow and transfers credits to mentor.
-- Idempotent: repeated calls do not create additional transfers.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_session_completion(
    p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_session public.sessions%ROWTYPE;
    v_role TEXT;
    v_counterparty_id UUID;
    v_confirmed_count INTEGER;
    v_already_settled BOOLEAN;
    v_result JSONB;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    -- Lock session for update
    SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session not found.';
    END IF;

    -- Verify caller is an authorized participant and determine role
    IF v_caller_id = v_session.teacher_id THEN
        v_role := 'teacher';
        v_counterparty_id := v_session.learner_id;
    ELSIF v_caller_id = v_session.learner_id THEN
        v_role := 'learner';
        v_counterparty_id := v_session.teacher_id;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Only designated session participants can confirm completion.';
    END IF;

    -- Idempotent return if already fully completed
    IF v_session.status = 'completed' THEN
        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'completed',
            'both_confirmed', true,
            'settled', true,
            'credit_cost', v_session.credit_cost
        );
    END IF;

    IF v_session.status NOT IN ('accepted', 'in_progress', 'awaiting_completion') THEN
        RAISE EXCEPTION 'Cannot confirm completion for session in status "%".', v_session.status;
    END IF;

    -- Insert participant's confirmation (idempotent ON CONFLICT)
    INSERT INTO public.session_confirmations (session_id, user_id, role)
    VALUES (p_session_id, v_caller_id, v_role)
    ON CONFLICT (session_id, user_id) DO NOTHING;

    -- Count distinct confirmations for this session
    SELECT COUNT(*) INTO v_confirmed_count
    FROM public.session_confirmations
    WHERE session_id = p_session_id;

    IF v_confirmed_count < 2 THEN
        -- Only one participant has confirmed so far: update status and wait
        UPDATE public.sessions
        SET status = 'awaiting_completion',
            updated_at = now()
        WHERE id = p_session_id;

        -- Notify counterparty that confirmation is pending
        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_counterparty_id, 'completion_pending', 'Confirmation Needed',
            'Your exchange partner has confirmed completion for "' || v_session.skill_title || '". Please confirm to finalize credit transfer.',
            '/sessions/' || p_session_id || '/complete'
        );

        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'awaiting_completion',
            'both_confirmed', false,
            'settled', false,
            'credit_cost', v_session.credit_cost
        );
    ELSE
        -- Both participants confirmed: atomically settle reservation
        SELECT EXISTS (
            SELECT 1 FROM public.credit_ledger
            WHERE session_id = p_session_id
              AND entry_type = 'escrow_release_earned'
        ) INTO v_already_settled;

        IF NOT v_already_settled THEN
            -- Deduct escrow from learner, increment lifetime_spent
            UPDATE public.credit_wallets
            SET escrow_balance = escrow_balance - v_session.credit_cost,
                lifetime_spent = lifetime_spent + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.learner_id;

            -- Add available balance to mentor, increment lifetime_earned
            UPDATE public.credit_wallets
            SET available_balance = available_balance + v_session.credit_cost,
                lifetime_earned = lifetime_earned + v_session.credit_cost,
                updated_at = now()
            WHERE profile_id = v_session.teacher_id;

            -- Update profile hours
            UPDATE public.profiles
            SET hours_learned = hours_learned + (v_session.duration_minutes / 60),
                updated_at = now()
            WHERE id = v_session.learner_id;

            UPDATE public.profiles
            SET hours_taught = hours_taught + (v_session.duration_minutes / 60),
                updated_at = now()
            WHERE id = v_session.teacher_id;

            -- Record immutable ledger transfer
            INSERT INTO public.credit_ledger (
                entry_type, source_wallet_id, destination_wallet_id, session_id,
                amount, idempotency_key, notes
            ) VALUES (
                'escrow_release_earned',
                v_session.learner_id,
                v_session.teacher_id,
                v_session.id,
                v_session.credit_cost,
                'escrow_release_' || v_session.id,
                'Bilateral completion release: ' || v_session.credit_cost || ' credit(s) transferred to mentor.'
            );

            -- Mark session completed
            UPDATE public.sessions
            SET status = 'completed',
                updated_at = now()
            WHERE id = p_session_id;

            -- Notify both parties
            INSERT INTO public.notifications (user_id, type, title, body, action_url, credit_impact)
            VALUES (
                v_session.teacher_id, 'credit_transfer', 'Credits Earned!',
                'Both participants confirmed "' || v_session.skill_title || '". ' || v_session.credit_cost || ' credit(s) added to your wallet.',
                '/wallet', v_session.credit_cost
            );

            INSERT INTO public.notifications (user_id, type, title, body, action_url)
            VALUES (
                v_session.learner_id, 'credit_transfer', 'Exchange Complete',
                'Both participants confirmed "' || v_session.skill_title || '". ' || v_session.credit_cost || ' credit(s) transferred to your mentor.',
                '/sessions'
            );
        END IF;

        RETURN jsonb_build_object(
            'session_id', p_session_id,
            'status', 'completed',
            'both_confirmed', true,
            'settled', true,
            'credit_cost', v_session.credit_cost
        );
    END IF;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 7: flag_unresolved_sessions
-- Flags sessions that have passed 72 hours since scheduled end without bilateral
-- confirmation. Preserves escrow balance in place; does NOT auto-settle.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.flag_unresolved_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_count INTEGER := 0;
    v_rec RECORD;
BEGIN
    FOR v_rec IN
        SELECT s.id, s.teacher_id, s.learner_id, s.skill_title
        FROM public.sessions s
        WHERE s.status IN ('accepted', 'in_progress', 'awaiting_completion')
          AND s.scheduled_end_at < (now() - interval '72 hours')
        FOR UPDATE OF s
    LOOP
        UPDATE public.sessions
        SET status = 'under_review',
            cancellation_reason = 'Flagged for review: 72 hours elapsed without bilateral completion confirmation.',
            updated_at = now()
        WHERE id = v_rec.id;

        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_rec.teacher_id, 'dispute_flagged', 'Session Flagged for Review',
            'Session for "' || v_rec.skill_title || '" has been flagged for community review due to unresolved confirmation after 72 hours.',
            '/sessions'
        );

        INSERT INTO public.notifications (user_id, type, title, body, action_url)
        VALUES (
            v_rec.learner_id, 'dispute_flagged', 'Session Flagged for Review',
            'Session for "' || v_rec.skill_title || '" has been flagged for community review due to unresolved confirmation after 72 hours.',
            '/sessions'
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- RPC 8: expire_pending_requests
-- Batch sweeps pending session requests that have reached the response cutoff:
-- (scheduled_start_at <= now() + 2 hours OR created_at <= now() - 48 hours).
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_pending_requests()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_count INTEGER := 0;
    v_session_id UUID;
BEGIN
    FOR v_session_id IN
        SELECT s.id
        FROM public.sessions s
        WHERE s.status = 'requested'
          AND (now() >= s.scheduled_start_at - interval '2 hours' OR now() >= s.created_at + interval '48 hours')
        FOR UPDATE OF s
    LOOP
        PERFORM public.expire_session_request(v_session_id);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- Grants on RPCs for authenticated users
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        GRANT EXECUTE ON FUNCTION public.create_session_request TO authenticated;
        GRANT EXECUTE ON FUNCTION public.accept_session_request TO authenticated;
        GRANT EXECUTE ON FUNCTION public.decline_session_request TO authenticated;
        GRANT EXECUTE ON FUNCTION public.cancel_session TO authenticated;
        GRANT EXECUTE ON FUNCTION public.expire_session_request TO authenticated;
        GRANT EXECUTE ON FUNCTION public.confirm_session_completion TO authenticated;
        GRANT EXECUTE ON FUNCTION public.flag_unresolved_sessions TO authenticated;
        GRANT EXECUTE ON FUNCTION public.expire_pending_requests TO authenticated;
    END IF;
END
$$;
