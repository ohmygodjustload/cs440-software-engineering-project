/**
 * user-settings.service.spec.ts — unit tests for UserSettingsService.
 *
 * Purpose: locks in the honest read-only boundary — current-user loads from
 * GET /api/users, and saveSettings() fails descriptively until the backend
 * adds PUT /api/users/{id}. None of this needs a running backend.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { User } from '../models/user';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  const users: User[] = [
    {
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Porter',
      username: 'JanePorter123',
      email: 'jane@example.com',
      phone: '456-456-4567',
      isClient: true,
      isServiceProvider: false,
      isAdmin: false
    }
  ];

  let service: UserSettingsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(UserSettingsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load the current user from GET /api/users', () => {
    let actual: User | undefined;
    service.getCurrentUser().subscribe((user) => (actual = user));

    const request = httpTesting.expectOne('/api/users');
    expect(request.request.method).toBe('GET');
    request.flush(users);

    expect(actual).toEqual(users[0]);
  });

  it('should error when the directory is empty', () => {
    let failed = false;
    service.getCurrentUser().subscribe({ error: () => (failed = true) });

    httpTesting.expectOne('/api/users').flush([]);

    expect(failed).toBeTrue();
  });

  it('should fail saveSettings honestly until PUT /api/users/{id} exists', () => {
    let message = '';
    service.saveSettings().subscribe({ error: (err: Error) => (message = err.message) });

    httpTesting.expectNone('/api/users/user-1');
    expect(message).toContain('PUT /api/users/{id}');
  });
});
