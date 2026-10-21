'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  User, 
  BookOpen, 
  Compass, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  X,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { useTimeSwap } from '../../lib/store';
import { SkillCategory, SkillItem } from '../../types';
import { getSupabaseBrowserClient } from '../../lib/supabase/client';

export default function OnboardingPage() {
  const router = useRouter();
  const { currentUser, updateCurrentUser } = useTimeSwap();

  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [userId, setUserId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form states
  const [name, setName] = useState(currentUser.name || '');
  const [headline, setHeadline] = useState(currentUser.headline || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [location, setLocation] = useState(currentUser.location || '');
  const [timezone, setTimezone] = useState(currentUser.timezone || 'IST (UTC+5:30)');
  const [avatar, setAvatar] = useState(currentUser.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80');

  // Teaching skills
  const [teachSkillName, setTeachSkillName] = useState('Interactive Prototyping & Motion');
  const [teachCategory, setTeachCategory] = useState<SkillCategory>('Design & Creative');
  const [teachProficiency, setTeachProficiency] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Master'>('Master');
  const [teachDesc, setTeachDesc] = useState('Hands-on micro-interaction tuning, component states, and physics-based feedback in modern web applications.');

  // Learning interests
  const [learnInterests, setLearnInterests] = useState<string[]>(
    currentUser.skillsLearning || ['Conversational Tamil', 'Blue Pottery Centering', 'Sourdough & Ancient Millets']
  );
  const [newInterestInput, setNewInterestInput] = useState('');

  // Availability
  const [selectedDays, setSelectedDays] = useState<string[]>(['Monday', 'Wednesday', 'Saturday']);
  const [timeSlot, setTimeSlot] = useState('18:00 to 21:00 IST');
  const [cadence, setCadence] = useState('Bi-weekly 60-minute exchanges');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Sync with Supabase on mount
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
          .then(({ data: profile }: { data: any }) => {
            if (profile) {
              if (profile.onboarding_completed) {
                router.push('/dashboard');
                return;
              }
              if (profile.onboarding_step && profile.onboarding_step >= 1 && profile.onboarding_step <= 6) {
                setStep(profile.onboarding_step);
              }
              if (profile.name) setName(profile.name);
              if (profile.headline) setHeadline(profile.headline);
              if (profile.bio) setBio(profile.bio);
              if (profile.location) setLocation(profile.location);
              if (profile.timezone) setTimezone(profile.timezone);
              if (profile.avatar_url) setAvatar(profile.avatar_url);
              if (profile.skills_learning && profile.skills_learning.length > 0) {
                setLearnInterests(profile.skills_learning);
              }
            }
          });
      }
    });
  }, [router]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addInterest = () => {
    if (newInterestInput.trim() && !learnInterests.includes(newInterestInput.trim())) {
      setLearnInterests([...learnInterests, newInterestInput.trim()]);
      setNewInterestInput('');
    }
  };

  const removeInterest = (tag: string) => {
    setLearnInterests(learnInterests.filter(t => t !== tag));
  };

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  ];

  const handleStepTransition = async (nextStep: number) => {
    setStep(nextStep);
    const supabase = getSupabaseBrowserClient();
    if (supabase && userId) {
      try {
        await (supabase.from('profiles') as any)
          .update({
            name: name.trim(),
            headline: headline.trim(),
            bio: bio.trim(),
            location: location.trim(),
            timezone,
            avatar_url: avatar,
            skills_learning: learnInterests,
            onboarding_step: nextStep,
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('Could not persist intermediate onboarding progress to Supabase:', err);
      }
    }
  };

  const handleFinish = async () => {
    setIsSyncing(true);
    const supabase = getSupabaseBrowserClient();

    if (supabase && userId) {
      try {
        // 1. Resolve or create skill in public.skills
        let skillId: string | null = null;
        const { data: existingSkill } = await (supabase
          .from('skills') as any)
          .select('id')
          .ilike('name', teachSkillName.trim())
          .maybeSingle();

        if (existingSkill) {
          skillId = (existingSkill as any).id;
        } else {
          const { data: newSkillRow } = await (supabase
            .from('skills') as any)
            .insert({
              name: teachSkillName.trim(),
              category: teachCategory,
            })
            .select('id')
            .maybeSingle();
          if (newSkillRow) skillId = (newSkillRow as any).id;
        }

        // 2. Insert member_skill
        if (skillId) {
          await (supabase
            .from('member_skills') as any)
            .upsert({
              profile_id: userId,
              skill_id: skillId,
              proficiency: teachProficiency,
              description: teachDesc.trim(),
            });
        }

        // 3. Insert weekly availability slots
        const dayMap: Record<string, number> = {
          Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
        };
        for (const day of selectedDays) {
          const dayNum = dayMap[day] ?? 1;
          await (supabase
            .from('availability_slots') as any)
            .insert({
              profile_id: userId,
              day_of_week: dayNum,
              start_time: '18:00:00',
              end_time: '21:00:00',
              timezone,
              preferred_cadence: cadence,
            });
        }

        // 4. Mark profile completed in Supabase
        await (supabase
          .from('profiles') as any)
          .update({
            name: name.trim(),
            headline: headline.trim(),
            bio: bio.trim(),
            location: location.trim(),
            timezone,
            avatar_url: avatar,
            skills_learning: learnInterests,
            onboarding_completed: true,
            onboarding_step: 6,
          })
          .eq('id', userId);
      } catch (err) {
        console.error('Error saving onboarding data to Supabase:', err);
      }
    }

    // Update client-side store
    const newSkill: SkillItem = {
      id: `sk-${Date.now()}`,
      name: teachSkillName,
      category: teachCategory,
      proficiency: teachProficiency,
      description: teachDesc,
    };

    updateCurrentUser({
      name,
      headline,
      bio,
      location,
      timezone,
      avatar,
      skillsTeaching: [newSkill, ...(currentUser.skillsTeaching || [])],
      skillsLearning: learnInterests,
      availability: {
        days: selectedDays,
        timeSlot,
        preferredCadence: cadence,
      },
      onboardingCompleted: true,
      onboardingStep: 6,
    });

    setIsSyncing(false);
    router.push('/dashboard');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      {/* Step Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Step {step} of {totalSteps}
          </span>
          <span className="text-xs text-ink-muted">
            {step === 1 && 'Introduction'}
            {step === 2 && 'Personal Details'}
            {step === 3 && 'Skill to Teach'}
            {step === 4 && 'Curiosity & Learning'}
            {step === 5 && 'Availability'}
            {step === 6 && 'Profile Review'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-subtle h-2 rounded-full overflow-hidden border border-line">
          <div
            className="bg-brand h-full transition-all duration-300 ease-out"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-surface rounded-modal border border-line shadow-elevated p-6 sm:p-10">
        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="space-y-6 text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-soft border border-brand/20 flex items-center justify-center text-brand">
              <Sparkles className="w-8 h-8 animate-pulse-subtle" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h1 className="text-3xl font-extrabold text-ink font-editorial tracking-tight">
                Welcome to TimeSwap, {currentUser.name || 'Friend'}
              </h1>
              <p className="text-sm text-ink-muted leading-relaxed">
                You are entering a community where learning is reciprocal. To establish your standing, we will configure what you love teaching and what you are eager to learn.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4 max-w-xl mx-auto">
              <div className="p-4 bg-surface-subtle rounded-xl border border-line space-y-2">
                <Clock className="w-5 h-5 text-brand" />
                <h2 className="font-bold text-xs text-ink">Equal Value</h2>
                <p className="text-[11px] text-ink-muted">One hour taught earns 1 credit. One hour learned costs 1 credit.</p>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-line space-y-2">
                <Globe className="w-5 h-5 text-brand" />
                <h2 className="font-bold text-xs text-ink">Multilateral</h2>
                <p className="text-[11px] text-ink-muted">Teach person A, spend credits with person B. No direct barter bottleneck.</p>
              </div>

              <div className="p-4 bg-surface-subtle rounded-xl border border-line space-y-2">
                <ShieldCheck className="w-5 h-5 text-brand" />
                <h2 className="font-bold text-xs text-ink">3 Credit Grant</h2>
                <p className="text-[11px] text-ink-muted">Awarded automatically upon email verification to fund your first exchanges.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: BASIC INFO & AVATAR */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-2xl font-bold text-ink font-editorial">Your Mentor Profile</h2>
              <p className="text-xs text-ink-muted">Introduce yourself to other members.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  Choose Your Avatar
                </label>
                <div className="flex items-center gap-4">
                  <Avatar src={avatar} name={name} size="xl" />
                  <div className="space-y-1.5">
                    <span className="text-xs text-ink-muted block">Select a demo portrait:</span>
                    <div className="flex items-center gap-2">
                      {sampleAvatars.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          aria-label={`Select avatar option ${idx + 1}`}
                          onClick={() => setAvatar(s)}
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-transform hover:scale-105 ${
                            avatar === s ? 'border-brand ring-2 ring-brand-soft' : 'border-transparent'
                          }`}
                        >
                          <img src={s} alt="avatar option" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Display Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Ananya Rao"
                  required
                />
                <Input
                  label="Headline / Profession"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="e.g. Principal Product Designer"
                  required
                />
              </div>

              <Textarea
                label="Short Biography"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="What drives your craft and what kind of exchanges excite you?"
                rows={3}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka"
                />
                <Input
                  label="Timezone"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  placeholder="e.g. IST (UTC+5:30)"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SKILL YOU TEACH */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-2xl font-bold text-ink font-editorial">Your Teaching Offering</h2>
              <p className="text-xs text-ink-muted">What skill or knowledge can you share with fellow learners?</p>
            </div>

            <div className="space-y-4">
              <Input
                label="Skill Title"
                value={teachSkillName}
                onChange={e => setTeachSkillName(e.target.value)}
                placeholder="e.g. Interactive Prototyping & Motion"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Discipline / Category"
                  value={teachCategory}
                  onChange={e => setTeachCategory(e.target.value as SkillCategory)}
                  options={[
                    { value: 'Design & Creative', label: 'Design & Creative' },
                    { value: 'Code & Technology', label: 'Code & Technology' },
                    { value: 'Languages & Writing', label: 'Languages & Writing' },
                    { value: 'Crafts & Hands-on', label: 'Crafts & Hands-on' },
                    { value: 'Music & Sound', label: 'Music & Sound' },
                    { value: 'Wellness & Lifestyle', label: 'Wellness & Lifestyle' },
                    { value: 'Business & Strategy', label: 'Business & Strategy' },
                  ]}
                />

                <Select
                  label="Your Mastery Level"
                  value={teachProficiency}
                  onChange={e => setTeachProficiency(e.target.value as any)}
                  options={[
                    { value: 'Beginner', label: 'Beginner (Introductory)' },
                    { value: 'Intermediate', label: 'Intermediate (Practical)' },
                    { value: 'Advanced', label: 'Advanced (Professional)' },
                    { value: 'Master', label: 'Master (Expert / Specialist)' },
                  ]}
                />
              </div>

              <Textarea
                label="What will a learner explore during a session?"
                value={teachDesc}
                onChange={e => setTeachDesc(e.target.value)}
                placeholder="Give a concise summary of what you cover during an exchange..."
                rows={3}
              />
            </div>
          </div>
        )}

        {/* STEP 4: LEARNING WISHLIST */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-2xl font-bold text-ink font-editorial">What do you want to learn?</h2>
              <p className="text-xs text-ink-muted">Add topics or crafts you are excited to explore using your earned credits.</p>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Add a topic of interest"
                    value={newInterestInput}
                    onChange={e => setNewInterestInput(e.target.value)}
                    placeholder="e.g. Sourdough baking, Carnatic flute, Pottery"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addInterest();
                      }
                    }}
                  />
                </div>
                <div className="self-end mb-1">
                  <Button type="button" variant="secondary" onClick={addInterest} icon={<Plus className="w-4 h-4" />}>
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  Your Current Wishlist ({learnInterests.length})
                </label>
                <div className="flex flex-wrap gap-2 p-4 bg-surface-subtle rounded-xl border border-line min-h-[80px]">
                  {learnInterests.map(item => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-line rounded-pill text-xs font-medium text-ink shadow-xs"
                    >
                      {item}
                      <button
                        type="button"
                        aria-label={`Remove interest ${item}`}
                        onClick={() => removeInterest(item)}
                        className="text-ink-muted hover:text-status-error transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: AVAILABILITY */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-2xl font-bold text-ink font-editorial">Weekly Availability</h2>
              <p className="text-xs text-ink-muted">When are you typically open for exchange sessions?</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                  Available Days of the Week
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {daysOfWeek.map(day => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={`p-3 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-brand text-white border-brand shadow-xs'
                            : 'bg-surface-subtle text-ink-muted border-line hover:border-brand/40 hover:text-ink'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Preferred Time Window"
                  value={timeSlot}
                  onChange={e => setTimeSlot(e.target.value)}
                  placeholder="e.g. 18:00 to 21:00 IST"
                />
                <Input
                  label="Preferred Cadence"
                  value={cadence}
                  onChange={e => setCadence(e.target.value)}
                  placeholder="e.g. Bi-weekly 60m exchanges"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: SUMMARY REVIEW */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-2xl font-bold text-ink font-editorial">Ready to Launch Your Profile</h2>
              <p className="text-xs text-ink-muted">Review your verified setup before entering the community directory.</p>
            </div>

            <div className="bg-surface-subtle p-5 rounded-xl border border-line space-y-4">
              <div className="flex items-center gap-4">
                <Avatar src={avatar} name={name} size="lg" />
                <div>
                  <h3 className="font-bold text-sm text-ink">{name}</h3>
                  <p className="text-xs text-ink-muted">{headline}</p>
                  <p className="text-[11px] text-ink-muted">{location} • {timezone}</p>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-line">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                  Offering to Teach:
                </span>
                <p className="text-xs text-ink font-semibold">
                  {teachSkillName} <span className="text-brand font-normal">({teachProficiency})</span>
                </p>
                <p className="text-xs text-ink-muted">{teachDesc}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                  Curious to Learn:
                </span>
                <p className="text-xs text-ink font-medium">
                  {learnInterests.join(' • ')}
                </p>
              </div>
            </div>

            <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep flex items-center justify-between">
              <span className="font-semibold">Starting Wallet Balance:</span>
              <span className="font-extrabold text-sm">3 Time Credits Granted</span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-line flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => handleStepTransition(step - 1)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => handleStepTransition(step + 1)}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Continue
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              loading={isSyncing}
              onClick={handleFinish}
              icon={<Check className="w-4 h-4" />}
              iconPosition="right"
            >
              Complete Profile & Go to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
