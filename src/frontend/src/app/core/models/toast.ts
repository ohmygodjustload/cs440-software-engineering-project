/**
 * toast.ts — typed view of one floating notification-popup (toast).
 *
 * Purpose: gives the whole front end a single shape for the top-right
 * popups required by the notifications ticket: a short title, an optional
 * detail line, a visual variant, and how long the popup stays before it
 * auto-dismisses. The timer line at the bottom of the popup is driven by
 * `durationMs`.
 */

/** Visual intent of a toast. Drives the accent colour only, never the text. */
export type ToastVariant = 'success' | 'info' | 'reminder';

/** Data needed to show one popup. The service assigns the `id`. */
export interface ToastInput {
  /** Bold headline, e.g. `You're Logged In!` or `Appointment booked`. */
  title: string;
  /** Optional second line, e.g. the appointment title + time. */
  message?: string;
  /** Accent colour. Defaults to `success`. */
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Defaults to 5000. */
  durationMs?: number;
}

/** A toast that is currently visible (or animating out). */
export interface Toast extends Required<Pick<ToastInput, 'title'>> {
  /** Unique id used for dismiss + tracking. */
  id: string;
  /** Optional second line. */
  message: string;
  /** Accent colour. */
  variant: ToastVariant;
  /** Milliseconds before auto-dismiss. */
  durationMs: number;
  /** True while the leave animation plays; the row is removed afterwards. */
  leaving: boolean;
}
