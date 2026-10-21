'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  X, 
  Bookmark, 
  Star, 
  Clock, 
  Compass, 
  ArrowRight, 
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { SkillCategory } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export default function DiscoverPage() {
  const { members, toggleSaveMember, currentUser } = useTimeSwap();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('All');
  const [selectedProficiency, setSelectedProficiency] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<'rating' | 'hours' | 'reviews'>('rating');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const categories: SkillCategory[] = [
    'All',
    'Design & Creative',
    'Code & Technology',
    'Languages & Writing',
    'Crafts & Hands-on',
    'Music & Sound',
    'Wellness & Lifestyle',
    'Business & Strategy',
  ];

  const filteredMembers = useMemo(() => {
    return members
      .filter(m => {
        // Exclude current user from self-booking
        if (m.id === currentUser.id) return false;

        // Query search
        if (query.trim()) {
          const q = query.toLowerCase();
          const matchesName = m.name.toLowerCase().includes(q);
          const matchesBio = m.bio.toLowerCase().includes(q);
          const matchesHeadline = m.headline.toLowerCase().includes(q);
          const matchesLocation = m.location.toLowerCase().includes(q);
          const matchesSkill = m.skillsTeaching.some(s => 
            s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
          );
          const matchesLearning = m.skillsLearning.some(l => l.toLowerCase().includes(q));

          if (!matchesName && !matchesBio && !matchesHeadline && !matchesLocation && !matchesSkill && !matchesLearning) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'All') {
          const hasCategory = m.skillsTeaching.some(s => s.category === selectedCategory);
          if (!hasCategory) return false;
        }

        // Proficiency filter
        if (selectedProficiency !== 'All') {
          const hasProf = m.skillsTeaching.some(s => s.proficiency === selectedProficiency);
          if (!hasProf) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedSort === 'rating') return b.rating - a.rating;
        if (selectedSort === 'hours') return b.hoursTaught - a.hoursTaught;
        if (selectedSort === 'reviews') return b.reviewCount - a.reviewCount;
        return 0;
      });
  }, [members, query, selectedCategory, selectedProficiency, selectedSort, currentUser]);

  const clearAllFilters = () => {
    setQuery('');
    setSelectedCategory('All');
    setSelectedProficiency('All');
    setSelectedSort('rating');
  };

  const isFiltered = query.trim() !== '' || selectedCategory !== 'All' || selectedProficiency !== 'All';

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 sm:pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-brand-deep">
              Global Skill Directory
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-editorial tracking-tight">
            Discover Mentors & Skills
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Connect with {members.length - 1} practitioners offering verified 1-on-1 exchanges for 1 time credit per hour.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="w-full md:w-80">
          <Input
            placeholder="Search mentors, skills, crafts..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            rightIcon={
              query ? (
                <button
                  aria-label="Clear search query"
                  onClick={() => setQuery('')}
                  className="hover:text-ink touch-target flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : undefined
            }
          />
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="space-y-3 sm:space-y-4">
        {/* Horizontal Category Chips */}
        <div className="-mx-3 sm:mx-0 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x pb-2">
          <div className="flex items-center gap-2 px-3 sm:px-0 w-max">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none touch-target ${
                  selectedCategory === cat
                    ? 'bg-brand text-white shadow-subtle'
                    : 'bg-surface border border-line text-ink-muted hover:text-ink hover:bg-surface-subtle'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 pt-1">
          <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-3 w-full sm:w-auto">
            <span className="text-xs text-ink-muted font-medium">
              Showing <strong className="text-ink">{filteredMembers.length}</strong> mentors
            </span>

            {isFiltered && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 shrink-0"
              >
                <X className="w-3.5 h-3.5" /> Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Proficiency Filter */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
              <span className="text-ink-muted hidden sm:inline shrink-0">Proficiency:</span>
              <select
                aria-label="Filter mentors by proficiency"
                value={selectedProficiency}
                onChange={e => setSelectedProficiency(e.target.value)}
                className="w-full sm:w-auto bg-surface text-ink text-xs font-medium rounded-lg border border-line px-2 sm:px-2.5 py-1.5 focus:border-brand focus:outline-none min-h-[36px]"
              >
                <option value="All">All Levels</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Master">Master</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex-1 sm:flex-initial flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
              <span className="text-ink-muted hidden sm:inline shrink-0">Sort:</span>
              <select
                aria-label="Sort mentors by criteria"
                value={selectedSort}
                onChange={e => setSelectedSort(e.target.value as any)}
                className="w-full sm:w-auto bg-surface text-ink text-xs font-medium rounded-lg border border-line px-2 sm:px-2.5 py-1.5 focus:border-brand focus:outline-none min-h-[36px]"
              >
                <option value="rating">Highest Rated</option>
                <option value="hours">Most Hours</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {filteredMembers.length === 0 ? (
        <div className="bg-surface rounded-modal border border-line p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-surface-subtle border border-line flex items-center justify-center text-ink-muted">
            <Search className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-ink font-editorial">No Mentors Found</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              We couldn&apos;t find any mentors matching &ldquo;{query}&rdquo; under the selected filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={clearAllFilters}>
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map(member => (
            <Card
              key={member.id}
              variant="interactive"
              className="flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                {/* Header with avatar & bookmark */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar} name={member.name} size="md" verified />
                    <div>
                      <h2 className="font-bold text-sm text-ink group-hover:text-brand transition-colors">
                        {member.name}
                      </h2>
                      <p className="text-xs text-ink-muted">{member.location}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      aria-label={member.isSaved ? `Remove ${member.name} from saved` : `Bookmark ${member.name}`}
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleSaveMember(member.id);
                      }}
                      title={member.isSaved ? 'Remove bookmark' : 'Bookmark mentor'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        member.isSaved
                          ? 'bg-brand-soft text-brand-deep border-brand/20'
                          : 'bg-surface text-ink-muted border-line hover:text-ink hover:bg-surface-subtle'
                      }`}
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${member.isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <div className="flex items-center gap-1 text-xs font-bold text-brand-deep bg-brand-soft px-2 py-0.5 rounded-pill border border-brand/20">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{member.rating.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Headline & Bio */}
                <div>
                  <h3 className="text-xs font-bold text-ink leading-snug line-clamp-1">
                    {member.headline}
                  </h3>
                  <p className="text-xs text-ink-muted line-clamp-2 mt-1 leading-relaxed">
                    {member.bio}
                  </p>
                </div>

                {/* Skills Teaching */}
                <div className="space-y-2 pt-2 border-t border-line">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                    Skills to Teach:
                  </span>
                  <div className="space-y-1.5">
                    {member.skillsTeaching.map(skill => (
                      <div
                        key={skill.id}
                        className="p-2 rounded-lg bg-surface-subtle border border-line text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-ink truncate mr-2">{skill.name}</span>
                        <Badge variant="neutral" size="sm">{skill.proficiency}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skills Wanted */}
                <div className="space-y-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                    Curious to Learn:
                  </span>
                  <p className="text-ink-muted truncate">
                    {member.skillsLearning.join(' • ')}
                  </p>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                <div className="text-[11px] text-ink-muted">
                  <span className="font-semibold text-ink">{member.hoursTaught}h</span> taught • {member.reviewCount} reviews
                </div>
                <Link href={`/members/${member.id}`} className="flex-shrink-0">
                  <Button variant="soft" size="sm" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                    View & Book
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
