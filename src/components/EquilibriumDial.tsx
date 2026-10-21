'use client';

import React, { useState } from 'react';
import { Clock, Check, ArrowRight, Sparkles, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from './ui/Button';
import { SUPPORTED_SESSION_DURATIONS, calculateCreditCost, SessionDuration } from '../lib/domain/duration';

export function EquilibriumDial() {
  const [duration, setDuration] = useState<SessionDuration>(60);
  const [isBalanced, setIsBalanced] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const credit = calculateCreditCost(duration);

  const handleSimulateExchange = () => {
    setIsSettling(true);
    setTimeout(() => {
      setIsSettling(false);
      setIsBalanced(true);
    }, 600);
  };

  const handleReset = () => {
    setIsBalanced(false);
  };

  return (
    <div className="relative bg-surface rounded-modal border border-line shadow-elevated p-4 sm:p-8 overflow-hidden max-w-xl mx-auto">
      {/* Background ambient daylight ring */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-soft/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent-peach/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-5 border-b border-line mb-4 sm:mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse-subtle shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            The Reciprocal Equilibrium Engine
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-subtle p-1 rounded-xl border border-line w-full sm:w-auto justify-center sm:justify-start">
          {SUPPORTED_SESSION_DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => {
                setDuration(d);
                setIsBalanced(false);
              }}
              className={`flex-1 sm:flex-initial min-w-[56px] min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-lg transition-all touch-target flex items-center justify-center ${
                duration === d
                  ? 'bg-surface text-brand-deep shadow-xs border border-line font-bold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Dial Graphic */}
      <div className="relative py-4 flex flex-col items-center justify-center">
        {/* Kinetic Arc SVG */}
        <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className="text-surface-subtle stroke-current"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Teach Arc (Forest Green) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              className={`text-brand stroke-current transition-all duration-700 ease-out`}
              strokeWidth="6"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (duration / 180))}
              strokeLinecap="round"
              fill="transparent"
            />
            {/* Reciprocal Completion Ring */}
            {isBalanced && (
              <circle
                cx="50"
                cy="50"
                r="44"
                className="text-brand-deep stroke-current animate-pulse-subtle"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                fill="transparent"
              />
            )}
          </svg>

          {/* Center Credit Hub */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider mb-0.5">
              Atomic Unit
            </span>
            <div className="flex items-baseline gap-1 my-0.5">
              <span className={`text-3xl font-extrabold text-ink transition-all duration-300 ${isSettling ? 'scale-110 text-brand' : ''}`}>
                {credit}
              </span>
              <span className="text-xs font-semibold text-brand-deep">{credit === 1 ? 'Credit' : 'Credits'}</span>
            </div>
            <span className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-brand" />
              {duration} min of attention
            </span>

            {isBalanced && (
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-pill border border-brand/20 animate-in fade-in">
                <Check className="w-3 h-3" /> 2-Way Confirmed
              </span>
            )}
          </div>
        </div>

        {/* Dynamic Exchange Nodes */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {/* Node 1: Teaching */}
          <div className="bg-surface-subtle p-3.5 rounded-xl border border-line flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-soft border border-brand/20 flex items-center justify-center text-brand-deep font-bold text-xs flex-shrink-0">
              + {credit}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-brand-deep">
                Phase A: Teach
              </div>
              <p className="text-xs font-semibold text-ink truncate">Vikram teaches Multilingual Typography</p>
              <p className="text-[11px] text-ink-muted">Earns 1 non-cash credit</p>
            </div>
          </div>

          {/* Node 2: Learning */}
          <div className="bg-surface-subtle p-3.5 rounded-xl border border-line flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-peach border border-[#EDD5C5] flex items-center justify-center text-[#733F23] font-bold text-xs flex-shrink-0">
              - {credit}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#733F23]">
                Phase B: Learn
              </div>
              <p className="text-xs font-semibold text-ink truncate">Vikram learns Carnatic Flute</p>
              <p className="text-[11px] text-ink-muted">From Arjun in Chennai</p>
            </div>
          </div>
        </div>

        {/* 2-Way Lock Explanation Bar */}
        <div className="w-full mt-4 bg-white/70 border border-line p-3 rounded-xl flex items-start gap-2.5 text-xs text-ink-muted">
          <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-ink">Dual-Participant Lock:</strong> Credits are held in mutual escrow. Transfer is finalized <span className="underline decoration-brand/50">only</span> after both the teacher and learner confirm session delivery.
          </p>
        </div>

        {/* Action Trigger */}
        <div className="mt-5 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs text-ink-muted text-center sm:text-left">
            Zero money involved. Pure reciprocity.
          </span>
          <div className="flex items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
            {isBalanced ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Reset Demonstration
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleSimulateExchange}
                loading={isSettling}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                className="w-full sm:w-auto min-h-[44px]"
              >
                Simulate 2-Way Completion
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
