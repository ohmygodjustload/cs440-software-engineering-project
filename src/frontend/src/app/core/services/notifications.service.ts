/**
 * notifications.service.ts — data-access boundary for the Notifications page.
 *
 * Purpose: the single place that knows how notification preferences and
 * history are loaded and persisted. It follows the HealthService /
 * UserSettingsService pattern (relative `/api` URLs so `ng serve` proxying
 * and same-origin production both work with no config).
 *
 * Backend contract (NOT YET IMPLEMENTED — Andrew Task):
 *
 * - Today the API has NO notification endpoints: no `GET /api/notifications`,
 *   no `PATCH /api/users/{id}/notification-preferences`, and no
 *   `POST /api/notifications/mark-all-read`. `UsersController` is GET-only
 *   and both user stores are read-only; `AppointmentsController` manages
 *   appointments only. There is also no authentication, so "current user" is
 *   the demo fallback from UserSettingsService (`GET /api/users` first entry).
 * - The expected future contract is:
 *     GET    /api/users/{id}/notification-preferences
 *       → NotificationPreferences
 *     PATCH  /api/users/{id}/notification-preferences
 *       body: NotificationPreferencesPatch → NotificationPreferences
 *     GET    /api/notifications?mine=true (newest first)
 *       → AppNotification[]
 *     POST   /api/notifications/mark-all-read
 *       body: { userId } → { updated: number }
 *   Until those endpoints exist, every method returns a failing observable
 *   with a clear message instead of faking success, writing to localStorage,
 *   or reporting fabricated delivery / scheduling / read results. The
 *   Notifications page surfaces those failures per-section (preferences keep
 *   their last confirmed state; history shows a retry state; mark-all-read
 *   preserves read state) and stays honest about what is unavailable.
 * - Never trust a user id from editable client state for authorization: ids
 *   passed here come from the loaded user record, and the backend must
 *   enforce ownership server-side when the endpoints are added (a non-admin
 *   may only touch their own record).
 * - Email delivery is OUT OF SCOPE for our project. The channel preference here is
 *   in-browser only. Reminder rows reflect preference flags only - they do
 *   not claim background scheduling is operational.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import {
  AppNotification,
  NotificationPreferences,
  NotificationPreferencesPatch
} from '../models/notification';

/** Result of the future bulk mark-all-read endpoint. */
export interface MarkAllReadResult {
  /** Number of notifications the backend marked as read. */
  updated: number;
}

function missing(feature: string, expected: string): Observable<never> {
  return throwError(
    () =>
      new Error(
        `${feature} is unavailable: the API has no ${expected} endpoint yet. ` +
          `Nothing was changed on the server.`
      )
  );
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the signed-in user's notification preferences.
   * Honestly fails until GET /api/users/{id}/notification-preferences exists.
   */
  getPreferences(userId: string): Observable<NotificationPreferences> {
    void this.http;
    void userId;
    return missing(
      'Notification preferences',
      'GET /api/users/{id}/notification-preferences'
    );
  }

  /**
   * Persists exactly one preference patch (immediate per-toggle save).
   * Honestly fails until PATCH /api/users/{id}/notification-preferences exists.
   */
  updatePreferences(
    userId: string,
    patch: NotificationPreferencesPatch
  ): Observable<NotificationPreferences> {
    void this.http;
    void userId;
    void patch;
    return missing(
      'Saving notification preferences',
      'PATCH /api/users/{id}/notification-preferences'
    );
  }

  /**
   * Loads the signed-in user's notification history (newest first).
   * Honestly fails until GET /api/notifications exists.
   */
  getNotifications(userId: string): Observable<AppNotification[]> {
    void this.http;
    void userId;
    return missing('Notification history', 'GET /api/notifications');
  }

  /**
   * Marks the signed-in user's unread notifications as read.
   * Honestly fails until POST /api/notifications/mark-all-read exists.
   */
  markAllRead(userId: string): Observable<MarkAllReadResult> {
    void this.http;
    void userId;
    return missing(
      'Mark all read',
      'POST /api/notifications/mark-all-read'
    );
  }
}
