/**
 * calendar-view.service.ts — per-user persistence for the default calendar view.
 *
 * Purpose: the single place that knows how the Settings "Default calendar
 * view" preference is stored and read back by the Calendar tab.
 *
 * Frontend-only by design (per scope): values live in localStorage keyed by
 * account id (`baaam.calendar.view.<userId>`), so each user keeps their own
 * view across sessions without any backend changes. Anything not in
 * CALENDAR_VIEWS is treated as missing and falls back to 'month'.
 */

import { Injectable } from '@angular/core';

import { CALENDAR_VIEWS } from '../models/user-settings';

const STORAGE_PREFIX = 'baaam.calendar.view.';

export type CalendarViewId = 'month' | 'week' | 'day' | 'agenda';

export const DEFAULT_CALENDAR_VIEW: CalendarViewId = 'month';

const VALID_VIEWS: readonly string[] = CALENDAR_VIEWS.map((option) => option.value);

@Injectable({
  providedIn: 'root'
})
export class CalendarViewService {
  /** Loads the saved view for one account id, or the default when none/invalid. */
  getView(userId: string | null | undefined): CalendarViewId {
    const raw = this.readRaw(userId);
    return this.isValidView(raw) ? raw : DEFAULT_CALENDAR_VIEW;
  }

  /** Persists the view for one account id (no-op when the id is missing). */
  setView(userId: string | null | undefined, view: string): void {
    if (!userId || !this.isValidView(view)) {
      return;
    }
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, view);
    } catch {
      // Storage unavailable (private mode, quota): the caller still applies
      // the view in memory; persistence is best-effort.
    }
  }

  private readRaw(userId: string | null | undefined): string | null {
    if (!userId) {
      return null;
    }
    try {
      return localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    } catch {
      return null;
    }
  }

  private isValidView(value: string | null): value is CalendarViewId {
    return value !== null && VALID_VIEWS.includes(value);
  }
}
