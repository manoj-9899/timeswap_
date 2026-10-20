'use client';

import React from 'react';
import Link from 'next/link';
import { Bookmark, Star, ArrowRight, Compass } from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';

export default function SavedMentorsPage() {
  const { members, toggleSaveMember } = useTimeSwap();

  const savedMembers = members.filter(m => m.isSaved);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-brand fill-current" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Bookmarks
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink font-editorial tracking-tight">
            Saved Mentors & Wishlist
          </h1>
          <p className="text-sm text-ink-muted">
            Mentors and craftsmen you have bookmarked for future skill exchanges.
          </p>
        </div>

        <Link href="/discover">
          <Button variant="secondary" icon={<Compass className="w-4 h-4" />}>
            Explore More Skills
          </Button>
        </Link>
      </div>

      {savedMembers.length === 0 ? (
        <div className="bg-surface rounded-modal border border-line p-12 text-center space-y-4 max-w-md mx-auto my-12">
          <Bookmark className="w-8 h-8 text-ink-muted mx-auto" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-ink font-editorial">No Saved Mentors Yet</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              When exploring the directory, click the bookmark icon on any mentor to save them to your personal shortlist.
            </p>
          </div>
          <Link href="/discover">
            <Button variant="primary" size="sm">
              Discover Mentors
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedMembers.map(member => (
            <Card
              key={member.id}
              variant="interactive"
              className="flex flex-col justify-between space-y-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={member.avatar} name={member.name} size="md" verified />
                    <div>
                      <h2 className="font-bold text-sm text-ink">{member.name}</h2>
                      <p className="text-xs text-ink-muted">{member.location}</p>
                    </div>
                  </div>

                  <button
                    aria-label={`Remove ${member.name} from saved bookmarks`}
                    onClick={e => {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleSaveMember(member.id);
                    }}
                    title="Remove from saved"
                    className="p-1.5 rounded-lg bg-brand-soft text-brand-deep border border-brand/20 hover:bg-brand-soft/70 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>

                <p className="text-xs font-semibold text-ink leading-snug line-clamp-1">
                  {member.headline}
                </p>

                <p className="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {member.bio}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-line">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted block">
                    Skills:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {member.skillsTeaching.map(s => (
                      <span
                        key={s.id}
                        className="text-[10px] bg-surface-subtle font-medium text-ink px-2 py-0.5 rounded border border-line"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <span className="text-[11px] text-ink-muted">
                  {member.hoursTaught}h taught • ★ {member.rating.toFixed(2)}
                </span>
                <Link href={`/members/${member.id}`}>
                  <Button variant="soft" size="sm" icon={<ArrowRight className="w-3 h-3" />} iconPosition="right">
                    Book Exchange
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
