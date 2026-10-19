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
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser']);
    auth.getCurrentUser.and.returnValue(client);
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
  it('does not present client totals as provider statistics', () => {
    auth.getCurrentUser.and.returnValue({ ...client, isServiceProvider: true });
    let failed = false;
    service.loadAppointments().subscribe({ error: () => failed = true });
    expect(failed).toBeTrue();
    http.expectNone(req => req.url === '/api/appointments');
  });
  it('propagates API failures', () => {
    let status = 0;
    service.loadAppointments().subscribe({ error: error => status = error.status });
    http.expectOne(req => req.url === '/api/appointments').flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(status).toBe(503);
  });
});
