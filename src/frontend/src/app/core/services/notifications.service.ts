/**
 * notifications.service.ts — data-access boundary for the Notifications page.
 * Purpose: the single place that knows how notification preferences and
 * history are loaded and persisted. Follows the HealthService pattern.
 */

import { HttpClient } from '@angular/common/http';
import { Component, Injectable, inject } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';

import {
  AppNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
  NotificationPreferencesPatch
} from '../models/notification';

/** Result of the bulk mark-all-read endpoint. */
export interface MarkAllReadResult {
  /** Number of notifications the backend marked as read. */
  updated: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private readonly http = inject(HttpClient);

  /** Loads notifications preferences (real saved state or defaults). */
  getPreferences(userId: string): Observable<NotificationPreferences> {
    return this.http
      .get<NotificationPreferences>(
        `/api/users/${encodeURIComponent(userId)}/notification-preferences`
      )
      .pipe(
        catchError(() => of(DEFAULT_NOTIFICATION_PREFERENCES))
      );
  }

  /** Persists exactly one preference patch. */
  updatePreferences(
    userId: string,
    patch: NotificationPreferencesPatch
  ): Observable<NotificationPreferences> {
    return this.http.patch<NotificationPreferences>(
      `/api/users/${encodeURIComponent(userId)}/notification-preferences`,
      patch
    );
  }

  /** Loads notification history (newest first). */
  getNotifications(userId: string): Observable<AppNotification[]> {
    if (!userId || userId === 'demo-user') {
      return of([]);
    }

    // The API derives the recipient from the authenticated account. `mine` is
    // intentionally a boolean authorization guard, not a user-id parameter.
    return this.http.get<AppNotification[]>('/api/notifications?mine=true');
  }

  /** Marks unread notifications as read. */
  markAllRead(userId: string): Observable<MarkAllReadResult> {
    return this.http.post<MarkAllReadResult>(
      '/api/notifications/mark-all-read',
      { userId }
    );
  }
}
