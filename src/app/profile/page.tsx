'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  User, 
  Save, 
  Plus, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Calendar,
  Globe,
  MapPin
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { SkillCategory, SkillItem } from '../../types';

export default function ProfilePage() {
  const { currentUser, updateCurrentUser } = useTimeSwap();

  const [name, setName] = useState(currentUser.name);
  const [headline, setHeadline] = useState(currentUser.headline);
  const [bio, setBio] = useState(currentUser.bio);
  const [location, setLocation] = useState(currentUser.location);
  const [timezone, setTimezone] = useState(currentUser.timezone);
  const [avatar, setAvatar] = useState(currentUser.avatar);

  // Teaching Skills
  const [skillsTeaching, setSkillsTeaching] = useState<SkillItem[]>(currentUser.skillsTeaching || []);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('Design & Creative');
  const [newSkillProficiency, setNewSkillProficiency] = useState<'Intermediate' | 'Advanced' | 'Master'>('Advanced');
  const [newSkillDesc, setNewSkillDesc] = useState('');
  const [showAddSkill, setShowAddSkill] = useState(false);

  // Learning Interests
  const [skillsLearning, setSkillsLearning] = useState<string[]>(currentUser.skillsLearning || []);
  const [newInterest, setNewInterest] = useState('');

  // Weekly Availability
  const [availableDays, setAvailableDays] = useState<string[]>(currentUser.availability?.days || ['Monday', 'Wednesday']);
  const [timeSlot, setTimeSlot] = useState(currentUser.availability?.timeSlot || '18:00 to 21:00 WET');
  const [cadence, setCadence] = useState(currentUser.availability?.preferredCadence || 'Bi-weekly 60m deep dives');

  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const toggleDay = (day: string) => {
    setAvailableDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const item: SkillItem = {
      id: `sk-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: newSkillProficiency,
      description: newSkillDesc.trim(),
    };

    setSkillsTeaching([...skillsTeaching, item]);
    setNewSkillName('');
    setNewSkillDesc('');
    setShowAddSkill(false);
  };

  const handleRemoveSkill = (id: string) => {
    setSkillsTeaching(skillsTeaching.filter(s => s.id !== id));
  };

  const handleAddInterest = () => {
    if (newInterest.trim() && !skillsLearning.includes(newInterest.trim())) {
      setSkillsLearning([...skillsLearning, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (item: string) => {
    setSkillsLearning(skillsLearning.filter(s => s !== item));
  };

  const handleSaveProfile = () => {
    updateCurrentUser({
      name,
      headline,
      bio,
      location,
      timezone,
      avatar,
      skillsTeaching,
      skillsLearning,
      availability: {
        days: availableDays,
        timeSlot,
        preferredCadence: cadence,
      },
    });

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-brand" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-deep">
              Personal Settings
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-editorial tracking-tight">
            My Exchange Profile
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            Update your public profile, teaching curriculum, and learning wishlist.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            onClick={handleSaveProfile}
            icon={<Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Save Changes
          </Button>
        </div>
      </div>

      {isSavedNotice && (
        <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-brand" />
          <span>Profile changes successfully saved across the platform!</span>
        </div>
      )}

      {/* Basic Profile Details */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-6">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line">
          General Identity
        </h2>

        <div className="space-y-5">
          <div className="flex items-center gap-5">
            <Avatar src={avatar} name={name} size="xl" verified />
            <div className="space-y-1">
              <span className="text-xs font-bold text-ink uppercase tracking-wider">Avatar URL</span>
              <Input
                value={avatar}
                onChange={e => setAvatar(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
            <Input
              label="Headline"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Biography"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Location"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />
            <Input
              label="Timezone"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Teaching Offerings */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="font-bold text-lg text-ink font-editorial">Skills You Offer to Teach</h2>
            <p className="text-xs text-ink-muted">Listed at 1.0 credit per 60 minutes.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSkill(!showAddSkill)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Add Skill
          </Button>
        </div>

        {/* Add Skill Drawer */}
        {showAddSkill && (
          <form onSubmit={handleAddSkill} className="p-4 bg-surface-subtle rounded-xl border border-line space-y-4 animate-in fade-in">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">New Skill Offering</h3>
            <Input
              label="Skill Name"
              value={newSkillName}
              onChange={e => setNewSkillName(e.target.value)}
              placeholder="e.g. Calligraphy Brushwork"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Category"
                value={newSkillCategory}
                onChange={e => setNewSkillCategory(e.target.value as any)}
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
                label="Proficiency"
                value={newSkillProficiency}
                onChange={e => setNewSkillProficiency(e.target.value as any)}
                options={[
                  { value: 'Intermediate', label: 'Intermediate' },
                  { value: 'Advanced', label: 'Advanced' },
                  { value: 'Master', label: 'Master' },
                ]}
              />
            </div>
            <Textarea
              label="What will the learner gain in 60m?"
              value={newSkillDesc}
              onChange={e => setNewSkillDesc(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddSkill(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Add to Profile
              </Button>
            </div>
          </form>
        )}

        {/* Existing skills */}
        <div className="space-y-3">
          {skillsTeaching.map(skill => (
            <div
              key={skill.id}
              className="p-4 bg-surface-subtle rounded-xl border border-line flex items-start justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink">{skill.name}</span>
                  <Badge variant="neutral" size="sm">{skill.category}</Badge>
                  <Badge variant="brand" size="sm">{skill.proficiency}</Badge>
                </div>
                <p className="text-xs text-ink-muted leading-relaxed">{skill.description}</p>
              </div>

              <button
                type="button"
                aria-label={`Remove ${skill.name} from offered skills`}
                onClick={() => handleRemoveSkill(skill.id)}
                className="text-ink-muted hover:text-status-error p-1"
                title="Remove skill"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Learning Wishlist */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-6">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line">
          Learning Interests (Curious to Learn)
        </h2>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Add skill or topic you want to learn..."
              value={newInterest}
              onChange={e => setNewInterest(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddInterest();
                }
              }}
            />
            <Button variant="secondary" onClick={handleAddInterest} icon={<Plus className="w-4 h-4" />}>
              Add
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {skillsLearning.map(item => (
              <span
                key={item}
                className="inline-flex items-center gap-1.5 bg-surface-subtle text-ink text-xs font-semibold px-3 py-1.5 rounded-pill border border-line"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item} from learning interests`}
                  onClick={() => handleRemoveInterest(item)}
                  className="hover:text-status-error text-ink-muted"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Availability Planner */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-6">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line">
          Availability Preferences
        </h2>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Available Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {daysOfWeek.map(day => {
                const isSelected = availableDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      isSelected
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'bg-surface-subtle text-ink-muted border-line hover:border-[#CED4C8]'
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
              label="Preferred Hours"
              value={timeSlot}
              onChange={e => setTimeSlot(e.target.value)}
            />
            <Input
              label="Exchange Cadence"
              value={cadence}
              onChange={e => setCadence(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
