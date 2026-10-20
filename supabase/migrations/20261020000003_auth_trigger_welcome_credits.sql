-- ==============================================================================
-- TimeSwap Migration: 20261020000003_auth_trigger_welcome_credits.sql
-- Description: Automated 3-Credit Welcome Grant upon Email Verification
-- Phase: Phase 1 (Backend Foundation)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Function: fn_handle_user_verification_and_welcome_grant()
-- Triggered AFTER INSERT OR UPDATE on auth.users.
-- Strict Rules:
-- 1. Unverified accounts receive ZERO credits.
-- 2. Verified accounts receive EXACTLY 3 whole credits.
-- 3. Idempotency key 'welcome_grant_<uid>' guarantees no duplicate grants.
-- 4. Creates an auditable 'welcome_grant' ledger journal entry.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_handle_user_verification_and_welcome_grant()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_handle TEXT;
    v_name TEXT;
    v_grant_inserted_id UUID;
BEGIN
    -- 1. Ensure Profile Exists for the Authenticated User
    v_handle := COALESCE(
        NEW.raw_user_meta_data->>'handle',
        'member_' || substr(NEW.id::text, 1, 8)
    );
    -- Ensure handle conforms to format constraint ^[a-z0-9_]{3,30}$
    v_handle := lower(regexp_replace(v_handle, '[^a-z0-9_]', '', 'g'));
    IF char_length(v_handle) < 3 THEN
        v_handle := 'user_' || substr(NEW.id::text, 1, 8);
    ELSIF char_length(v_handle) > 30 THEN
        v_handle := substr(v_handle, 1, 30);
    END IF;

    v_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    IF char_length(trim(v_name)) < 2 THEN
        v_name := 'New Member';
    END IF;

    INSERT INTO public.profiles (
        id,
        handle,
        name,
        avatar_url,
        timezone
    )
    VALUES (
        NEW.id,
        v_handle,
        v_name,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'),
        COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2. Ensure Wallet Container Exists (Initialized with 0 if new)
    INSERT INTO public.credit_wallets (
        profile_id,
        available_balance,
        escrow_balance,
        lifetime_earned,
        lifetime_spent
    )
    VALUES (
        NEW.id,
        0,
        0,
        0,
        0
    )
    ON CONFLICT (profile_id) DO NOTHING;

    -- 3. Check for Email Verification Status
    -- Rule: The 3-credit grant must be awarded ONLY when email is verified.
    IF NEW.email_confirmed_at IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.email_confirmed_at IS NULL) THEN
        
        -- Attempt to insert the unique welcome grant ledger entry
        -- The unique constraint on idempotency_key prevents duplicate entries.
        INSERT INTO public.credit_ledger (
            entry_type,
            destination_wallet_id,
            amount,
            idempotency_key,
            notes
        )
        VALUES (
            'welcome_grant',
            NEW.id,
            3,
            'welcome_grant_' || NEW.id::text,
            'Initial welcome grant of 3 whole time credits awarded upon verified email registration.'
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id INTO v_grant_inserted_id;

        -- If grant was newly inserted (not previously awarded), update wallet balance
        IF v_grant_inserted_id IS NOT NULL THEN
            UPDATE public.credit_wallets
            SET available_balance = available_balance + 3,
                lifetime_earned = lifetime_earned + 3,
                updated_at = now()
            WHERE profile_id = NEW.id;

            -- Create welcome notification
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                body,
                action_url,
                credit_impact
            )
            VALUES (
                NEW.id,
                'welcome',
                'Welcome to TimeSwap!',
                'Your email has been verified and 3 welcome credits have been placed in your wallet. Explore skills to begin!',
                '/wallet',
                3
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition on auth.users
DROP TRIGGER IF EXISTS trg_user_verification_welcome_grant ON auth.users;
CREATE TRIGGER trg_user_verification_welcome_grant
AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.fn_handle_user_verification_and_welcome_grant();
