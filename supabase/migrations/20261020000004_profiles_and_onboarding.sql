-- ==============================================================================
-- TimeSwap Migration: 20261020000004_phase2_profiles_and_onboarding.sql
-- Description: Profiles Onboarding State, Learning Interests & Skills Insertion
-- Phase: Phase 2 (Authentication, Profiles, Onboarding & Discovery)
-- ==============================================================================

-- 1. ADD ONBOARDING & PROFILE ENHANCEMENTS TO profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step SMALLINT NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 6),
ADD COLUMN IF NOT EXISTS skills_learning TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS badges TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON public.profiles(onboarding_completed);

-- ------------------------------------------------------------------------------
-- 2. ALLOW AUTHENTICATED USERS TO INSERT NEW SKILLS INTO TAXONOMY
-- Mentors creating new custom skills during onboarding can register them.
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "skills_insert_authenticated" ON public.skills;
CREATE POLICY "skills_insert_authenticated"
ON public.skills FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ------------------------------------------------------------------------------
-- 3. SEED STANDARD SKILL TAXONOMY
-- Pre-populates common exchange topics so users can select or search them immediately.
-- ------------------------------------------------------------------------------
INSERT INTO public.skills (name, category)
VALUES
    ('Design System Architecture & Tokens', 'Design & Creative'),
    ('Grid Systems & Swiss Typography', 'Design & Creative'),
    ('Interactive Prototyping & Motion', 'Design & Creative'),
    ('Conversational Japanese (Intermediate)', 'Languages & Writing'),
    ('Shodō (Japanese Brush Calligraphy)', 'Crafts & Hands-on'),
    ('Botanical Watercolor Painting Techniques', 'Crafts & Hands-on'),
    ('Rust Systems Programming & Concurrency', 'Code & Technology'),
    ('Next.js Architecture & Performance', 'Code & Technology'),
    ('Specialty Coffee Extraction & Roasting', 'Crafts & Hands-on'),
    ('Modular Synthesizer Sound Design', 'Music & Sound'),
    ('Sourdough Bread Fermentation & Baking', 'Crafts & Hands-on'),
    ('Ceramic Wheel Throwing & Centering', 'Crafts & Hands-on'),
    ('Acoustic Guitar Fingerpicking', 'Music & Sound'),
    ('Mindfulness & Breathwork Foundations', 'Wellness & Lifestyle'),
    ('Product Strategy & Modular Scaling', 'Business & Strategy')
ON CONFLICT (name) DO NOTHING;
