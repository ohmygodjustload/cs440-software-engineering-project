import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { User } from '../models/user';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let http: HttpTestingController;
  let service: StatisticsService;
  let auth: jasmine.SpyObj<AuthService>;

  const client: User = {
    id: 'client-1',
    firstName: 'Jane',
    lastName: 'Doe',
    username: 'jane',
    isClient: true,
    isAdmin: false,
    isServiceProvider: false
  };

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['getCurrentUser', 'getToken']
    );
    auth.getCurrentUser.and.returnValue(client);
    auth.getToken.and.returnValue('test-jwt');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth }
      ]
    });

    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(StatisticsService);
  });

  afterEach(() => http.verify());

  it('loads client history from the statistics endpoint', () => {
    let ids: string[] = [];

    service.loadAppointments().subscribe(items => {
      ids = items.map(item => item.id);
    });

    const request = http.expectOne(
      '/api/statistics/appointments?role=client'
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Authorization'))
      .toBe('Bearer test-jwt');

    request.flush([
      { id: 'done', status: 'Completed' },
      { id: 'cancel', status: 'Canceled' }
    ]);

    expect(ids).toEqual(['done', 'cancel']);
  });

  it('does not request data without a signed-in account', () => {
    auth.getCurrentUser.and.returnValue(null);
    let message = '';

    service.loadAppointments().subscribe({
      error: (error: Error) => message = error.message
    });

    expect(message).toContain('Please sign in');
    http.expectNone(req => req.url.startsWith('/api/'));
  });

  it('loads provider history including canceled slots', () => {
    auth.getCurrentUser.and.returnValue({
      ...client,
      isClient: false,
      isServiceProvider: true
    });

    let ids: string[] = [];

    service.loadAppointments().subscribe(items => {
      ids = items.map(item => item.id);
    });

    const request = http.expectOne(
      '/api/statistics/appointments?role=provider'
    );

    expect(request.request.headers.get('Authorization'))
      .toBe('Bearer test-jwt');

    request.flush([
      { id: 'done', status: 'Completed', userId: 'customer-1' },
      { id: 'canceled', status: 'Canceled', userId: 'customer-2' },
      { id: 'canceled-slot', status: 'Canceled', userId: null }
    ]);

    expect(ids).toEqual(['done', 'canceled', 'canceled-slot']);
  });

  it('propagates API failures', () => {
    let status = 0;

    service.loadAppointments().subscribe({
      error: error => status = error.status
    });

    http.expectOne('/api/statistics/appointments?role=client')
      .flush('Unavailable', {
        status: 503,
        statusText: 'Unavailable'
      });

    expect(status).toBe(503);
  });

  it('requests each role separately for enhanced accounts', () => {
    auth.getCurrentUser.and.returnValue({
      ...client,
      isServiceProvider: true
    });

    expect(service.availableRoles()).toEqual(['provider', 'client']);

    let clientIds: string[] = [];
    let providerIds: string[] = [];

    service.loadAppointments('client').subscribe(items => {
      clientIds = items.map(item => item.id);
    });

    http.expectOne('/api/statistics/appointments?role=client')
      .flush([{ id: 'my-booking' }]);

    service.loadAppointments('provider').subscribe(items => {
      providerIds = items.map(item => item.id);
    });

    http.expectOne('/api/statistics/appointments?role=provider')
      .flush([{ id: 'customer-booking' }]);

    expect(clientIds).toEqual(['my-booking']);
    expect(providerIds).toEqual(['customer-booking']);
  });

  it('does not fetch provider data for a client-only account', () => {
    let failed = false;

    service.loadAppointments('provider').subscribe({
      error: () => failed = true
    });

    expect(failed).toBeTrue();
    http.expectNone(req => req.url.startsWith('/api/'));
  });

  it('does not fetch statistics for admin accounts', () => {
    auth.getCurrentUser.and.returnValue({
      ...client,
      isAdmin: true
    });

    expect(service.availableRoles()).toEqual([]);

    service.loadAppointments().subscribe({
      error: () => undefined
    });

    http.expectNone(req => req.url.startsWith('/api/'));
  });
});