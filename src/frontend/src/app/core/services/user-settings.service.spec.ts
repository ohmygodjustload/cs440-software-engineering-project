/**
 * user-settings.service.spec.ts — unit tests for UserSettingsService.
 *
 * Purpose: locks in the current-user boundary — signed-in users load their
 * own record via GET /api/users/{id} (so "hii" edits only "hii"), logged-out
 * demo mode falls back to users[0], and saveSettings() persists via
 * PUT /api/users/{id}. None of this needs a running backend.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { User } from '../models/user';
import { AuthService } from './auth.service';
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

  const hiiUser: User = {
    id: 'hii-id',
    firstName: 'hi',
    lastName: 'bye',
    username: 'hii',
    email: 'email@gmail',
    phone: '123456789',
    isClient: false,
    isServiceProvider: true,
    isAdmin: false
  };

  let service: UserSettingsService;
  let httpTesting: HttpTestingController;
  let authService: { getCurrentUser: jasmine.Spy };

  beforeEach(() => {
    authService = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService }
      ]
    });

    service = TestBed.inject(UserSettingsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load the signed-in user by id so edits target their own account', () => {
    authService.getCurrentUser.and.returnValue(hiiUser);
    let actual: User | undefined;
    service.getCurrentUser().subscribe((user) => (actual = user));

    const request = httpTesting.expectOne('/api/users/hii-id');
    expect(request.request.method).toBe('GET');
    request.flush(hiiUser);

    expect(actual).toEqual(hiiUser);
  });

  it('should fall back to the first directory entry when logged out', () => {
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

  it('should persist settings via PUT /api/users/{id}', () => {
    let actual: User | undefined;
    service
      .saveSettings('hii-id', { firstName: 'hi', lastName: 'bye', email: 'new@example.com' })
      .subscribe((user) => (actual = user));

    const request = httpTesting.expectOne('/api/users/hii-id');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstName: 'hi',
      lastName: 'bye',
      email: 'new@example.com'
    });
    request.flush({ ...hiiUser, email: 'new@example.com' });

    expect(actual?.email).toBe('new@example.com');
  });
});
