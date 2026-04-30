// Single source of truth for legal-policy versions.
// Bump these whenever the policy text changes materially. The /api/legal/accept
// endpoint records the version a user agreed to so we can prove what they saw.

export const LEGAL_VERSIONS = {
  terms:         '2026-04-30',
  privacy:       '2026-04-30',
  dmca:          '2026-04-30',
  accessibility: '2026-04-30',
} as const;

export type PolicyType = keyof typeof LEGAL_VERSIONS;

export const COMBINED_VERSION = `${LEGAL_VERSIONS.terms}|${LEGAL_VERSIONS.privacy}`;

// Minimum age to use The Altar (mirrors Privacy Policy §6 and Terms §2).
// COPPA defines under-13 as "child"; we block under-13 sign-ups and (server-side)
// remove the auth user if a younger date-of-birth slips through.
export const MIN_AGE_YEARS = 13;
