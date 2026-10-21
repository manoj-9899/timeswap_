/**
 * TimeSwap Authoritative Session Duration & Integer Credit Cost Domain Rules
 *
 * Invariant Rules:
 * 1. Only whole-hour durations are supported: 60, 120, and 180 minutes.
 * 2. Fractional-hour sessions (30m, 90m, etc.) and fractional credits (0.5, 1.5, etc.) are strictly prohibited.
 * 3. Credit cost is deterministically derived from duration:
 *      creditCost = durationMinutes / 60
 * 4. Division is valid ONLY after confirming duration is exactly 60, 120, or 180.
 * 5. Input must never be silently coerced to a nearby duration. Unsupported durations must be rejected.
 */

export const SUPPORTED_SESSION_DURATIONS = [60, 120, 180] as const;

export type SessionDuration = (typeof SUPPORTED_SESSION_DURATIONS)[number];

export const DURATION_CREDIT_MAP: Record<SessionDuration, number> = {
  60: 1,
  120: 2,
  180: 3,
} as const;

export interface DurationOption {
  minutes: SessionDuration;
  hours: number;
  credits: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const DURATION_OPTIONS: readonly DurationOption[] = [
  {
    minutes: 60,
    hours: 1,
    credits: 1,
    label: '60 Minutes (1 Hour)',
    shortLabel: '60m',
    description: 'Standard Deep Dive — 1 Credit',
  },
  {
    minutes: 120,
    hours: 2,
    credits: 2,
    label: '120 Minutes (2 Hours)',
    shortLabel: '120m',
    description: 'Comprehensive Workshop — 2 Credits',
  },
  {
    minutes: 180,
    hours: 3,
    credits: 3,
    label: '180 Minutes (3 Hours)',
    shortLabel: '180m',
    description: 'Intensive Masterclass — 3 Credits',
  },
] as const;

/**
 * Type guard verifying whether a given number is an authorized whole-hour duration.
 */
export function isValidSessionDuration(minutes: unknown): minutes is SessionDuration {
  if (typeof minutes !== 'number' || !Number.isInteger(minutes)) {
    return false;
  }
  return SUPPORTED_SESSION_DURATIONS.includes(minutes as SessionDuration);
}

/**
 * Derives the exact integer credit cost for a validated whole-hour session duration.
 * Throws a TypeError/RangeError if the duration is not strictly 60, 120, or 180.
 */
export function calculateCreditCost(durationMinutes: SessionDuration): number {
  if (!isValidSessionDuration(durationMinutes)) {
    throw new Error(
      `Invalid session duration (${durationMinutes} min). TimeSwap strictly requires whole-hour sessions: 60m (1 credit), 120m (2 credits), or 180m (3 credits).`
    );
  }
  const credits = durationMinutes / 60;
  if (!Number.isInteger(credits) || credits < 1 || credits > 3) {
    throw new Error(`Derived credit cost for ${durationMinutes} min is not an authorized integer credit amount.`);
  }
  return credits;
}

/**
 * Validates any duration input and computes authoritative integer credit cost.
 * Never silently coerces unsupported inputs.
 */
export function validateAndCalculateCreditCost(durationMinutes: unknown): 
  | { valid: true; duration: SessionDuration; credits: number }
  | { valid: false; error: string } {
  if (durationMinutes === undefined || durationMinutes === null) {
    return {
      valid: false,
      error: 'Session duration is required.',
    };
  }

  const num = typeof durationMinutes === 'number' ? durationMinutes : Number(durationMinutes);

  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      valid: false,
      error: `Invalid duration value "${durationMinutes}". Session duration must be an integer number of minutes (60, 120, or 180).`,
    };
  }

  if (!isValidSessionDuration(num)) {
    return {
      valid: false,
      error: `Unsupported session duration (${num} min). Only 60 minutes (1 credit), 120 minutes (2 credits), and 180 minutes (3 credits) are accepted. Fractional sessions (such as 30m or 90m) are not supported.`,
    };
  }

  return {
    valid: true,
    duration: num,
    credits: num / 60,
  };
}

/**
 * Verifies that a credit amount is a positive whole integer.
 */
export function isIntegerCreditAmount(credits: unknown): credits is number {
  return typeof credits === 'number' && Number.isInteger(credits) && credits >= 0;
}

/**
 * Formats duration and credit cost for display across UI components.
 */
export function formatDurationAndCredits(durationMinutes: SessionDuration): string {
  const credits = calculateCreditCost(durationMinutes);
  const creditWord = credits === 1 ? 'Credit' : 'Credits';
  return `${durationMinutes}m • ${credits} ${creditWord}`;
}
