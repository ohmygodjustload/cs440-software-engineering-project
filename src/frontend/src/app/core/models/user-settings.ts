/**
 * user-settings.ts — settings-form shapes and option lists for the Settings page.
 *
 * Purpose: keeps the option catalogues the Settings page renders (time zones,
 * calendar views, secondary tabs) in one documented place so the component
 * stays focused on form state. Nothing here performs I/O.
 */

/** Stable IANA time-zone identifier shown in the Time zone dropdown. */
export interface TimeZoneOption {
  /** IANA identifier, e.g. `America/Chicago`. Persist this, never a UTC offset. */
  readonly value: string;
  /** Human-readable label, e.g. `Central Time — Chicago`. */
  readonly label: string;
}

/**
 * Curated list of IANA identifiers for the Time zone dropdown. A short,
 * stable list is used instead of `Intl.supportedValuesOf('timeZone')` so the
 * options (and tests) are deterministic across browsers; the browser's own
 * zone is used as the default when it appears in this list, otherwise UTC.
 */
export const TIME_ZONES: readonly TimeZoneOption[] = [
  { value: 'UTC', label: 'UTC — Coordinated Universal Time' },
  { value: 'America/Chicago', label: 'Central Time — Chicago' },
  { value: 'America/New_York', label: 'Eastern Time — New York' },
  { value: 'America/Denver', label: 'Mountain Time — Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time — Los Angeles' },
  { value: 'America/Anchorage', label: 'Alaska Time — Anchorage' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time — Honolulu' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' }
];

/** Calendar views the Settings page lets the user prefer. */
export interface CalendarViewOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Candidate default calendar views. NOTE: the Calendar page is still a
 * placeholder and consumes none of these yet, so this preference is
 * collected in the form but not applied anywhere. It is kept as a small,
 * conventional Month/Week/Day/Agenda set so a future calendar can adopt it
 * without a data migration.
 */
export const CALENDAR_VIEWS: readonly CalendarViewOption[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' }
];

/** Id of a secondary-navigation destination on the Settings page. */
export type SettingsTabId = 'profile' | 'login' | 'preferences' | 'privacy';

/** One item in the Settings secondary navigation strip. */
export interface SettingsTab {
  readonly id: SettingsTabId;
  readonly label: string;
  /** All four sections render content; non-persisted areas stay read-only. */
  readonly available: boolean;
  /** Reason shown on unavailable tabs (tooltip + screen-reader text). */
  readonly unavailableReason?: string;
}

/**
 * Secondary navigation for the Settings page. Each entry switches a panel on
 * this page (accessible tabs, not routes): Profile holds the editable
 * identity form, Preferences holds calendar/notification choices, Login &
 * security shows read-only account facts, and Privacy explains data handling.
 * Nothing here invents a password, verification, or delete workflow — areas
 * without backend support stay read-only with an honest explanation.
 */
export const SETTINGS_TABS: readonly SettingsTab[] = [
  { id: 'profile', label: 'Profile', available: true },
  { id: 'login', label: 'Login & security', available: true },
  { id: 'preferences', label: 'Preferences', available: true },
  { id: 'privacy', label: 'Privacy', available: true }
];

/** Editable value snapshot of the Settings form. */
export interface SettingsFormValue {
  fullName: string;
  email: string;
  phone: string;
  timeZone: string;
  defaultCalendarView: string;
  notifyMedical: boolean;
  notifyBeauty: boolean;
  notifyFitness: boolean;
}
