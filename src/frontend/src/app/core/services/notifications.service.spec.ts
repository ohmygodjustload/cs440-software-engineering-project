/**
 * notifications.service.spec.ts — unit tests for NotificationsService.
 *
 * Purpose: locks in the honest missing-backend boundary — every method fails
 * descriptively until the documented endpoint exists, and no HTTP request is
 * issued. None of this needs a running backend.
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

  it('should fail getPreferences honestly until the endpoint exists', () => {
    let message = '';
    service.getPreferences('user-1').subscribe({ error: (err: Error) => (message = err.message) });

    httpTesting.expectNone('/api/users/user-1/notification-preferences');
    expect(message).toContain('GET /api/users/{id}/notification-preferences');
  });

  it('should fail updatePreferences honestly until the endpoint exists', () => {
    let message = '';
    service
      .updatePreferences('user-1', { inBrowserEnabled: false })
      .subscribe({ error: (err: Error) => (message = err.message) });

    httpTesting.expectNone('/api/users/user-1/notification-preferences');
    expect(message).toContain('PATCH /api/users/{id}/notification-preferences');
  });

  it('should fail getNotifications honestly until the endpoint exists', () => {
    let message = '';
    service.getNotifications('user-1').subscribe({ error: (err: Error) => (message = err.message) });

    httpTesting.expectNone('/api/notifications');
    expect(message).toContain('GET /api/notifications');
  });

  it('should fail markAllRead honestly until the endpoint exists', () => {
    let message = '';
    service.markAllRead('user-1').subscribe({ error: (err: Error) => (message = err.message) });

    httpTesting.expectNone('/api/notifications/mark-all-read');
    expect(message).toContain('POST /api/notifications/mark-all-read');
  });
});
