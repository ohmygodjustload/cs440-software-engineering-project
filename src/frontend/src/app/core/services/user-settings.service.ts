/**
 * user-settings.service.ts — data-access boundary for the Settings page.
 *
 * Purpose: the single place that knows how the Settings page loads the
 * current user. It follows the HealthService pattern (relative `/api` URLs so
 * `ng serve` proxying and same-origin production both work with no config).
 *
 * Persistence contract (NOT YET IMPLEMENTED — read carefully):
 * - Today `UsersController` is GET-only (`GET /api/users`, `GET
 *   /api/users/{id}`); both the in-memory and Mongo stores are read-only and
 *   the API registers no authentication, so there is no endpoint that can
 *   persist profile or preference edits.
 * - The expected future contract is `PUT /api/users/{id}` accepting the
 *   editable profile fields plus preferences and returning the updated
 *   `User`. Until that endpoint exists, `saveSettings()` returns a failing
 *   observable with a clear message instead of faking success, writing to
 *   localStorage, or reporting persisted edits as saved. The Settings page
 *   surfaces that failure, preserves the user's edits, and shows a banner
 *   explaining that saving is unavailable.
 * - Never trust a user id from editable client state for authorization: the
 *   id used here comes from the loaded user record, not from a form field,
 *   and the backend must enforce ownership server-side when the endpoint is
 *   added (a non-admin may only modify their own record; admins may manage
 *   any record per README "Roles and privacy").
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, throwError } from 'rxjs';

import { User } from '../models/user';

/** Relative user-directory endpoint (proxied to the API in development). */
const USERS_ENDPOINT = '/api/users';

/** Demo fallback: with no authentication, the first directory entry stands in for the signed-in user. */
export const DEMO_USER_HINT = 'demo-user';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly http = inject(HttpClient);

  /**
   * Loads the "current" user. The backend has no authentication or
   * `/api/users/me`, so the first entry of `GET /api/users` is used as the
   * demo signed-in user. Do not hardcode the seed's example identity, email,
   * or phone as real data — they are only what the API happens to return.
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User[]>(USERS_ENDPOINT).pipe(
      map((users) => {
        const current = users[0];
        if (!current) {
          throw new Error('No users were returned by GET /api/users.');
        }
        return current;
      })
    );
  }

  /** Loads one user by id (used by tests and future deep-links). */
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${USERS_ENDPOINT}/${encodeURIComponent(id)}`);
  }

  /**
   * Persists Settings edits. NOT AVAILABLE: the backend exposes no update
   * endpoint, so this always fails honestly with a descriptive error. It
   * exists so the component's save flow (dirty tracking, loading state,
   * failure preserves edits) is wired to a single boundary that a future
   * `PUT /api/users/{id}` can implement without touching the component.
   */
  saveSettings(): Observable<never> {
    return throwError(
      () =>
        new Error(
          'Saving is unavailable: the API has no user-update endpoint yet ' +
            '(expected PUT /api/users/{id}). Your edits have been kept on this page.'
        )
    );
  }
}
