/**
 * user-settings.service.ts — data-access boundary for the Settings page.
 *
 * Purpose: the single place that knows how the Settings page loads the
 * current user. It follows the HealthService pattern (relative `/api` URLs so
 * `ng serve` proxying and same-origin production both work with no config).
 *
 * Current-user resolution:
 * - When signed in, the record saved by AuthService at login is authoritative:
 *   the Settings page edits that account's id, so e.g. user "hii" updates
 *   only "hii"'s record via PUT /api/users/{id}.
 * - When logged out (demo mode), the first entry of `GET /api/users` stands
 *   in for the signed-in user.
 * - Never trust a user id from editable client state for authorization: the
 *   id used here comes from the loaded/stored user record, not from a form
 *   field, and the backend must enforce ownership server-side (a non-admin may
 *   only modify their own record; admins may manage any record per README
 *   "Roles and privacy").
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { AuthService } from './auth.service';
import { User } from '../models/user';

/** Partial patch for profile-only fields (preferences are separate). */
const USERS_ENDPOINT = '/api/users';

/** Demo fallback: with no authentication, the first directory entry stands in for the signed-in user. */
export const DEMO_USER_HINT = 'demo-user';

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Loads the "current" user. When signed in, the record saved by AuthService
   * at login wins, so Settings edits target the signed-in account's id (e.g.
   * "hii" edits only "hii"). When logged out, the first entry of
   * `GET /api/users` is used as the demo signed-in user. Do not hardcode the
   * seed's example identity, email, or phone as real data — they are only
   * what the API happens to return.
   */
  getCurrentUser(): Observable<User> {
    const signedIn = this.authService.getCurrentUser();
    if (signedIn) {
      return this.http.get<User>(`${USERS_ENDPOINT}/${encodeURIComponent(signedIn.id)}`);
    }

    return this.http.get<User[]>(USERS_ENDPOINT).pipe(
      map((users: User[]) => {
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
   * Persists Settings edits for the loaded account id via
   * `PUT /api/users/{id}` (firstName, lastName, email, phone) and returns the
   * updated `User`. The component passes the id from the loaded record — never
   * from an editable form field — so "hii"'s edits land on "hii"'s account.
   */
  saveSettings(id: string, patch: UserSettingsPatch): Observable<User> {
    return this.http.put<User>(`${USERS_ENDPOINT}/${encodeURIComponent(id)}`, patch);
  }
}

/** Partial patch for profile-only fields (preferences are separate). */
export interface UserSettingsPatch {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

