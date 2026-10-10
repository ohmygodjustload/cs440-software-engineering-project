/**
 * notification.ts — typed views of the notification contracts for the
 * Notifications page.
 *
 * Purpose: gives the front end a single typed place for notification
 * preferences (in-browser delivery channel + reminder schedule) and recent
 * notification history. These mirror the documented future backend contract
 * in notifications.service.ts — when that API lands, update these interfaces
 * in the same pull request.
 *
 * Notes:
 * - Email delivery is OUT OF SCOPE for this project. The delivery channel
 *   here is in-browser only; the top panel is therefore "In-browser
 *   notifications", not email.
 * - The backend stores all timestamps as UTC ISO-8601 strings. Conversion to
 *   the viewer's time zone happens in the component before display.
 * - Category preferences (Medical / Beauty / Fitness) live on the Settings
 *   page form and are NOT part of this model, so updating a delivery-channel
 *   preference never overwrites them.
 */

/** Stable ids for the two independent reminder schedule rows. */
export type ReminderId = 'dayBefore' | 'hourBefore';

/**
 * Delivery + reminder preferences for one user.
 * Each flag is independent: changing one must never change another.
 */
export interface NotificationPreferences {
  /** In-browser confirmations for appointment create / edit / cancel. */
  inBrowserEnabled: boolean;
  /** Reminder shown one day before the appointment. */
  reminderDayBeforeEnabled: boolean;
  /** Reminder shown one hour before the appointment. */
  reminderHourBeforeEnabled: boolean;
}

/** Partial patch used for immediate per-toggle persistence. */
export type NotificationPreferencesPatch = Partial<NotificationPreferences>;

/** Defaults used only before the first confirmed load (never rendered as saved state). */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inBrowserEnabled: true,
  reminderDayBeforeEnabled: true,
  reminderHourBeforeEnabled: true
};

/** Machine-readable event kinds the history list can render. */
export type NotificationEventKind =
  | 'appointment-created'
  | 'appointment-edited'
  | 'appointment-cancelled'
  | 'reminder';

/**
 * One entry in the authenticated user's recent-notification history.
 * `createdAt` is the time the backend recorded the notification (UTC
 * ISO-8601). It is NOT an email delivery timestamp — never label it "sent"
 * unless a delivery receipt field is added server-side.
 */
export interface AppNotification {
  /** Unique id of the notification record. */
  id: string;
  /** Owner of the notification (mirrors Appointment.userId). */
  userId: string;
  /** Structured event kind; drives the left-column label. */
  event: NotificationEventKind;
  /** Human-readable event label, e.g. `Appointment created`. */
  eventLabel: string;
  /** Appointment-related summary, e.g. `Annual physical`. */
  message: string;
  /** Related appointment id when known (used for future deep-links only). */
  appointmentId?: string | null;
  /** When the backend recorded the notification (UTC ISO-8601). */
  createdAt: string;
  /** Read state as recorded by the backend. */
  isRead: boolean;
}

/** Human-readable labels for event kinds (fallback when the API omits eventLabel). */
export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventKind, string> = {
  'appointment-created': 'Appointment created',
  'appointment-edited': 'Appointment edited',
  'appointment-cancelled': 'Appointment cancelled',
  reminder: 'Reminder'
};
