/**
 * notifications.service.spec.ts — unit tests for NotificationsService.
 *
 * Purpose: locks in the real notification-preferences + history boundary —
 * every method hits the documented endpoint with the right method and body.
 * None of this needs a running backend.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(NotificationsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should GET /api/users/{id}/notification-preferences', () => {
    let actual: unknown;
    service.getPreferences('user-1').subscribe((prefs) => (actual = prefs));

    const request = httpTesting.expectOne('/api/users/user-1/notification-preferences');
    expect(request.request.method).toBe('GET');
    request.flush({ inBrowserEnabled: true, reminderDayBeforeEnabled: true, reminderHourBeforeEnabled: true });

    expect(actual).toBeTruthy();
  });

  it('should fall back to defaults when preferences are missing', () => {
    let actual: { inBrowserEnabled: boolean } | undefined;
    service.getPreferences('user-1').subscribe((prefs) => (actual = prefs));

    httpTesting.expectOne('/api/users/user-1/notification-preferences').flush('nope', {
      status: 404,
      statusText: 'Not Found'
    });

    expect(actual?.inBrowserEnabled).toBeTrue();
  });

  it('should PATCH /api/users/{id}/notification-preferences with the patch', () => {
    let actual: unknown;
    service.updatePreferences('user-1', { inBrowserEnabled: false }).subscribe((prefs) => (actual = prefs));

    const request = httpTesting.expectOne('/api/users/user-1/notification-preferences');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ inBrowserEnabled: false });
    request.flush({ inBrowserEnabled: false, reminderDayBeforeEnabled: true, reminderHourBeforeEnabled: true });

    expect(actual).toBeTruthy();
  });

  it('should GET /api/notifications?mine=true for history', () => {
    let actual: unknown[] | undefined;
    service.getNotifications('user-1').subscribe((items) => (actual = items));

    const request = httpTesting.expectOne('/api/notifications?mine=true');
    expect(request.request.method).toBe('GET');
    request.flush([]);

    expect(actual).toEqual([]);
  });

  it('should POST /api/notifications/mark-all-read with the user id', () => {
    let actual: { updated: number } | undefined;
    service.markAllRead('user-1').subscribe((result) => (actual = result));

    const request = httpTesting.expectOne('/api/notifications/mark-all-read');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ userId: 'user-1' });
    request.flush({ updated: 1 });

    expect(actual).toEqual({ updated: 1 });
  });
});
