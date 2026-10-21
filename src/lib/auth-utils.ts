/**
 * TimeSwap Authentication & Navigation Utilities
 * Provides open-redirect protection and safe URL validation.
 */

/**
 * Validates and sanitizes a redirect destination URL to prevent Open Redirect vulnerabilities.
 * Strictly permits only relative paths starting with a single '/' and rejects protocol-relative,
 * absolute, scheme-based, or control-character-injected URLs.
 *
 * @param destination The untrusted redirect target from query parameter or callback
 * @param fallback The default fallback route (defaults to '/dashboard')
 * @returns A safe relative URL path
 */
export function sanitizeRedirectPath(destination: string | null | undefined, fallback: string = '/dashboard'): string {
  if (!destination || typeof destination !== 'string') {
    return fallback;
  }

  const trimmed = destination.trim();

  // Must begin with a single '/' and not start with '//' or '/\'
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\')) {
    return fallback;
  }

  // Prevent control characters and CRLF injection (HTTP response splitting)
  if (/[\r\n\t\0]/.test(trimmed) || /%0[ad]/i.test(trimmed)) {
    return fallback;
  }

  // Extract path segment before query '?' or hash '#'
  const pathPart = trimmed.split(/[?#]/)[0];

  // Must not contain scheme colon in the path segment (prevents "javascript:", "https:", "data:")
  if (pathPart.includes(':')) {
    return fallback;
  }

  // Prevent backslash evasion anywhere in the path part
  if (pathPart.includes('\\')) {
    return fallback;
  }

  return trimmed;
}

/**
 * Validates password strength according to TimeSwap security requirements.
 * - Minimum 8 characters
 * - Returns a descriptive error message if invalid, or null if valid.
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required.';
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  return null;
}
