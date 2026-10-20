'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Sun, 
  RotateCcw, 
  CheckCircle2, 
  Lock,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { useTimeSwap } from '../../lib/store';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';

export default function SettingsPage() {
  const { currentUser, updateCurrentUser, resetDemoData } = useTimeSwap();

  const [emailAlerts, setEmailAlerts] = useState(currentUser.notificationPreferences?.emailAlerts ?? true);
  const [sessionReminders, setSessionReminders] = useState(currentUser.notificationPreferences?.sessionReminders ?? true);
  const [creditUpdates, setCreditUpdates] = useState(currentUser.notificationPreferences?.creditUpdates ?? true);
  const [digest, setDigest] = useState(currentUser.notificationPreferences?.communityDigest ?? false);

  const [savedNotice, setSavedNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const handleSavePreferences = () => {
    updateCurrentUser({
      notificationPreferences: {
        emailAlerts,
        sessionReminders,
        creditUpdates,
        communityDigest: digest,
      },
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleResetData = () => {
    if (confirm('Are you sure you want to reset all demo state to initial seed?')) {
      resetDemoData();
      setResetNotice(true);
      setTimeout(() => setResetNotice(false), 2500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand" />
            <span className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Preferences
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-ink font-editorial tracking-tight">
            Account & Platform Settings
          </h1>
          <p className="text-sm text-ink-muted">
            Manage your account security, notification triggers, and demo environment.
          </p>
        </div>

        <Button variant="primary" onClick={handleSavePreferences}>
          Save Preferences
        </Button>
      </div>

      {savedNotice && (
        <div className="p-4 bg-brand-soft border border-brand/20 rounded-xl text-xs text-brand-deep font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-brand" />
          <span>Preferences successfully updated!</span>
        </div>
      )}

      {resetNotice && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <RotateCcw className="w-4 h-4 text-amber-700" />
          <span>Demo state reset to initial seed data!</span>
        </div>
      )}

      {/* Account Info */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-5">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line">
          Account Credentials
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Account Email"
            value={currentUser.email || 'ana.silva@example.com'}
            readOnly
            hint="Email tied to your demo profile."
          />
          <Input
            label="Platform ID"
            value={currentUser.id}
            readOnly
            hint="Unique member identifier."
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-5">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line">
          Notification Alerts
        </h2>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line cursor-pointer">
            <div>
              <span className="text-xs font-bold text-ink block">Session Reminders</span>
              <span className="text-[11px] text-ink-muted">Alert 1 hour before scheduled video exchanges.</span>
            </div>
            <input
              type="checkbox"
              checked={sessionReminders}
              onChange={e => setSessionReminders(e.target.checked)}
              className="w-4 h-4 text-brand rounded focus:ring-brand"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line cursor-pointer">
            <div>
              <span className="text-xs font-bold text-ink block">Credit Escrow & Transfer Alerts</span>
              <span className="text-[11px] text-ink-muted">Notify when a partner confirms completion or transfers credits.</span>
            </div>
            <input
              type="checkbox"
              checked={creditUpdates}
              onChange={e => setCreditUpdates(e.target.checked)}
              className="w-4 h-4 text-brand rounded focus:ring-brand"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line cursor-pointer">
            <div>
              <span className="text-xs font-bold text-ink block">Email Notifications</span>
              <span className="text-[11px] text-ink-muted">Simulate email delivery for exchange requests and messages.</span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={e => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-brand rounded focus:ring-brand"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 bg-surface-subtle rounded-xl border border-line cursor-pointer">
            <div>
              <span className="text-xs font-bold text-ink block">Weekly Community Digest</span>
              <span className="text-[11px] text-ink-muted">Curated spotlight on new crafts, linguists, and artisans.</span>
            </div>
            <input
              type="checkbox"
              checked={digest}
              onChange={e => setDigest(e.target.checked)}
              className="w-4 h-4 text-brand rounded focus:ring-brand"
            />
          </label>
        </div>
      </div>

      {/* Appearance: Strictly Light-Only Visual Direction */}
      <div className="bg-surface rounded-modal border border-line shadow-subtle p-6 sm:p-8 space-y-4">
        <h2 className="font-bold text-lg text-ink font-editorial pb-3 border-b border-line flex items-center justify-between">
          <span>Appearance & Design Theme</span>
          <Badge variant="brand" size="sm">Light Only</Badge>
        </h2>

        <div className="p-4 bg-brand-soft/40 border border-brand/20 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-deep">
            <Sun className="w-4 h-4 text-brand" />
            <span>Refined Light Aesthetic Built for Clarity & Warmth</span>
          </div>
          <p className="text-xs text-ink-muted leading-relaxed">
            TimeSwap is intentionally architected as a pure, daylight-inspired light theme (`#FAF9F6` ground, `#FFFFFF` surfaces, `#347A5C` evergreen brand accents, and `#242922` ink). We do not provide a dark theme to preserve typographic contrast and an optimistic, paper-like human reading experience.
          </p>
        </div>
      </div>

      {/* Demo State Control: Reset Demo Data */}
      <div className="bg-surface rounded-modal border border-red-200 shadow-subtle p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-red-100">
          <div>
            <h2 className="font-bold text-lg text-status-error font-editorial">Demo Environment Control</h2>
            <p className="text-xs text-ink-muted">Revert all local storage records to initial seed profiles, sessions, and wallet balance.</p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={handleResetData}
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Demo Data
          </Button>
        </div>
      </div>
    </div>
  );
}
