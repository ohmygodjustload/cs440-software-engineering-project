import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { User } from '../models/user';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  let http: HttpTestingController;
  let service: StatisticsService;
  let auth: jasmine.SpyObj<AuthService>;
  const client: User = { id: 'client-1', firstName: 'Jane', lastName: 'Doe', username: 'jane',
    isClient: true, isAdmin: false, isServiceProvider: false };
  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['getCurrentUser', 'getToken']
    );
    auth.getCurrentUser.and.returnValue(client);
    auth.getToken.and.returnValue('test-jwt');
    auth.getCurrentUser.and.returnValue(client);
    auth.getToken.and.returnValue('test-jwt');
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), { provide: AuthService, useValue: auth }
    ] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(StatisticsService);
  });
  afterEach(() => http.verify());
  it('loads all pages and keeps only the signed-in client history', () => {
    let ids: string[] = [];
    service.loadAppointments().subscribe(items => ids = items.map(item => item.id));
    const first = http.expectOne(req => req.url === '/api/appointments' && req.params.get('page') === '1');
    expect(first.request.params.get('pageSize')).toBe('100');
    first.flush({ page: 1, pageSize: 2, total: 4, items: [
      { id: 'done', userId: 'client-1', status: 'Completed' }, { id: 'other', userId: 'client-2' }
    ] });
    const second = http.expectOne(req => req.params.get('page') === '2');
    second.flush({ page: 2, pageSize: 2, total: 4, items: [
      { id: 'cancel', userId: 'client-1', status: 'Canceled' }, { id: 'demo', userId: 'demo-user' }
    ] });
    expect(ids).toEqual(['done', 'cancel']);
  });
  it('does not request appointment data without a signed-in account', () => {
    auth.getCurrentUser.and.returnValue(null);
    let message = '';
    service.loadAppointments().subscribe({ error: (error: Error) => message = error.message });
    expect(message).toContain('Please sign in');
    http.expectNone(req => req.url === '/api/appointments');
  });
  it('loads provider-owned history and excludes unbooked availability', () =>{
    auth.getCurrentUser.and.returnValue({ ...client, isClient: false, isServiceProvider: true});
    let ids: string[] = [];
    service.loadAppointments().subscribe(items => ids = items.map(item => item.id));
    const request = http.expectOne('/api/provider-dashboard/appointments');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-jwt');
    request.flush([
      { id: 'done', status: 'Completed', userId: 'customer-1'},
      { id: 'canceled', status: 'Canceled', userId: 'customer-2' },
      { id: 'open', status: 'Available', userId: null },
      { id: 'canceled-slot', status: 'Canceled', userId: null }
    ]);
    expect(ids).toEqual(['done', 'canceled']);
    http.expectNone(req => req.url === '/api/appointments');
  });
  it('propagates API failures', () => {
    let status = 0;
    service.loadAppointments().subscribe({ error: error => status = error.status });
    http.expectOne(req => req.url === '/api/appointments').flush('Unavailable', {status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });
  it('offers both views for enhanced accounts and keeps their client bookings separate', () => {
    auth.getCurrentUser.and.returnValue({ ...client, isServiceProvider: true});
    expect(service.availableRoles()).toEqual(['provider', 'client']);
    let ids: string[] = [];
    service.loadAppointments('client').subscribe(items => ids = items.map(item => item.id));
    http.expectOne(req => req.url === '/api/appointments').flush({ page: 1, pageSize: 100, total: 2, items: [
      { id: 'my-booking', userId: 'client-1'}, { id: 'customer-booking', useeId: 'someone-else' }
    ]});
    expect(ids).toEqual(['my-booking']);
  })
  it('does not fetch provider data for a client-only account', () => {
    let failed = false;
    service.loadAppointments('provider').subscribe({ error: () => failed = true });
    expect(failed).toBeTrue();
    http.expectNone(req => req.url === '/api/provider-dashboard/appointments');
  })
  it('does not fetch client or provider totals for admin-only accounts', () => {
    auth.getCurrentUser.and.returnValue({ ...client, isAdmin: true});
    expect(service.availableRoles()).toEqual([]);
    service.loadAppointments().subscribe({ error: () => undefined });
    http.expectNone(req => req.url.startsWith('/api/'));
  });

});
