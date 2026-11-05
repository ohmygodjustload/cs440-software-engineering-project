/**
 * toast.service.ts — global top-right notification-popup (toast) queue.
 *
 * Purpose: single place any page calls to show a floating popup in the top
 * right corner. Popups auto-dismiss after `durationMs` (the timer line at the
 * bottom visualises the remaining time), can be dismissed early with the X,
 * and animate in/out via CSS in the popup component.
 *
 * Usage:
 *   inject(ToastService).show({ title: "You're Logged In!" });
 *   toastService.showAppointmentBooked('Annual physical', '2026-10-20T09:00:00Z');
 */

import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

import { Toast, ToastInput } from '../models/toast';

const DEFAULT_DURATION_MS = 5000;
/** Leave-animation length in ms. Must match `.toast--leaving` in CSS. */
const LEAVE_MS = 350;
/** Max simultaneous popups; oldest auto-dismisses early when exceeded. */
const MAX_TOASTS = 4;

let toastSequence = 0;

function formatWhen(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }

  const timestamp = Date.parse(iso);

  if (Number.isNaN(timestamp)) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private readonly toastsSubject = new BehaviorSubject<Toast[]>([]);
  /** Live list rendered by the popup component. */
  readonly toasts$: Observable<Toast[]> = this.toastsSubject.asObservable();
  /** Pending auto-dismiss / removal timers, keyed by toast id. */
  private readonly timers = new Map<string, number[]>();

  private readonly router = inject(Router, { optional: true });

  /** Synchronous snapshot (handy for specs). */
  get toasts(): Toast[] {
    return this.toastsSubject.value;
  }

  /** Show one popup. Returns its id for manual dismissal. */
  show(input: ToastInput): string {
    const id = `toast-${Date.now()}-${toastSequence++}`;
    const toast: Toast = {
      id,
      title: input.title,
      message: input.message ?? '',
      variant: input.variant ?? 'success',
      durationMs: input.durationMs && input.durationMs > 0 ? input.durationMs : DEFAULT_DURATION_MS,
      leaving: false,
      actionUrl: input.actionUrl
    };

    let next = [...this.toastsSubject.value, toast];
    // Keep the stack bounded: drop the oldest non-leaving toast first.
    while (next.filter((item) => !item.leaving).length > MAX_TOASTS) {
      const oldest = next.find((item) => !item.leaving);
      if (!oldest) {
        break;
      }
      next = next.filter((item) => item.id !== oldest.id);
    }
    this.toastsSubject.next(next);

    this.trackTimer(id, window.setTimeout(() => this.dismiss(id), toast.durationMs));
    return id;
  }

  /** Start the leave animation, then remove the toast. Safe to call twice. */
  dismiss(id: string): void {
    const current = this.toastsSubject.value;
    const target = current.find((item) => item.id === id);
    if (!target || target.leaving) {
      return;
    }

    this.toastsSubject.next(current.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
    this.trackTimer(
      id,
      window.setTimeout(() => {
        this.toastsSubject.next(this.toastsSubject.value.filter((item) => item.id !== id));
        this.clearTimers(id);
      }, LEAVE_MS)
    );
  }

  navigate(url: string): Promise<boolean> {
    return this.router?.navigateByUrl(url) ?? Promise.resolve(false);
  }

  /** Remove every popup immediately (used on sign-out). */
  clear(): void {
    for (const id of this.timers.keys()) {
      this.clearTimers(id);
    }
    this.toastsSubject.next([]);
  }

  /** Remember a pending timeout so `clear()` can cancel it before it fires. */
  private trackTimer(id: string, handle: number): void {
    const pending = this.timers.get(id) ?? [];
    pending.push(handle);
    this.timers.set(id, pending);
  }

  /** Cancel + forget every pending timeout for one toast. */
  private clearTimers(id: string): void {
    for (const handle of this.timers.get(id) ?? []) {
      window.clearTimeout(handle);
    }
    this.timers.delete(id);
  }

  /** First popup after sign-in. Always exactly "You're Logged In!". */
  showLoggedIn(): string {
    return this.show({ title: `You're Logged In!`, message: 'Welcome back to BAAAM.', variant: 'success' });
  }

  /** Confirmation popup after sign-out. Always exactly "You're Logged Out!". */
  showLoggedOut(): string {
    return this.show({ title: `You're Logged Out!`, message: 'See you next time.', variant: 'info' });
  }

  /** One popup per missed/unread notification, queued after the greeting. */
  showMissed(eventLabel: string, message: string, actionUrl = '/notifications'): string {
    const title = eventLabel?.trim() ? eventLabel.trim() : 'Missed notification';
    return this.show({ title, message, variant: 'info', actionUrl });
  }

  /** Appointment created / booked (client books a slot, provider publishes one). */
  showAppointmentBooked(title: string, startDateTime?: string | null): string {
    const when = formatWhen(startDateTime ?? undefined);
    return this.show({
      title: 'Appointment booked',
      message: [title?.trim() || 'Appointment', when].filter(Boolean).join(' · '),
      variant: 'success',
      actionUrl: '/appointments'
    });
  }

  /** Appointment edited / rescheduled. */
  showAppointmentModified(title: string, startDateTime?: string | null): string {
    const when = formatWhen(startDateTime ?? undefined);
    return this.show({
      title: 'Appointment updated',
      message: [title?.trim() || 'Appointment', when].filter(Boolean).join(' · '),
      variant: 'info',
      actionUrl: '/appointments'
    });
  }

  /** Appointment soft-deleted. */
  showAppointmentDeleted(title?: string | null): string {
    return this.show({
      title: 'Appointment deleted',
      message: title?.trim() ?? '',
      variant: 'info',
      actionUrl: '/appointments'
    });
  }

  /** Appointment cancelled (status -> Canceled). */
  showAppointmentCancelled(title: string, startDateTime?: string | null): string {
    const when = formatWhen(startDateTime ?? undefined);
    return this.show({
      title: 'Appointment cancelled',
      message: [title?.trim() || 'Appointment', when].filter(Boolean).join(' · '),
      variant: 'info',
      actionUrl: '/appointments'
    });
  }

  /** Notification preference or settings change confirmed. */
  showNotificationSettingChanged(detail?: string): string {
    return this.show({
      title: 'Notification settings updated',
      message: detail?.trim() || 'Your notification preferences were saved.',
      variant: 'success',
      actionUrl: '/notifications'
    });
  }
}
