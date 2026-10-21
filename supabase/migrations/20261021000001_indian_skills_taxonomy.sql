-- ==============================================================================
-- TimeSwap Migration: 20261021000001_indian_skills_taxonomy.sql
-- Description: Additional Indian Localized Skills for Public Skills Taxonomy
-- Idempotent, non-destructive insertion with ON CONFLICT (name) DO NOTHING
-- ==============================================================================

INSERT INTO public.skills (name, category)
VALUES
    ('Multilingual Typography & Grid Systems', 'Design & Creative'),
    ('Carnatic Flute & Swara Improvisation', 'Music & Sound'),
    ('Conversational Tamil for Beginners', 'Languages & Writing'),
    ('Terracotta & Natural Ash Glazes', 'Crafts & Hands-on'),
    ('Hindustani Vocal Swara Foundations', 'Music & Sound'),
    ('Sourdough & Ancient Millet Baking', 'Crafts & Hands-on'),
    ('Artisanal Coffee Roasting & South Indian Filter Brew', 'Wellness & Lifestyle'),
    ('Balcony & Small-Space Permaculture', 'Wellness & Lifestyle'),
    ('Composting & Living Soil Microbiology', 'Crafts & Hands-on'),
    ('Black & White Film Chemistry & Development', 'Crafts & Hands-on'),
    ('Manual Rangefinder Exposure & Metering', 'Design & Creative'),
    ('Narrative Nonfiction & Personal Essays', 'Languages & Writing'),
    ('Sentence Architecture & Developmental Editing', 'Languages & Writing'),
    ('Pranayama & Nervous System Regulation', 'Wellness & Lifestyle'),
    ('Ayurvedic Dinacharya (Daily Rhythms)', 'Wellness & Lifestyle'),
    ('Product Vision & 1-Page Strategy Canvas', 'Business & Strategy'),
    ('Story-Driven Pitch Decks for Founders', 'Business & Strategy'),
    ('Interactive Prototyping & Motion Design', 'Design & Creative'),
    ('Botanical Watercolor & Gouache Painting', 'Crafts & Hands-on')
ON CONFLICT (name) DO NOTHING;
