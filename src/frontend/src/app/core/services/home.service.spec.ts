import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HomeService } from './home.service';

describe('HomeService', () => {
  it('loads later pages and keeps only the booking demo owner', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(HomeService);
    let resultIds: string[] = [];

    service.loadAppointments().subscribe((items) => {
      resultIds = items.map((item) => item.id);
    });

    const first = http.expectOne((request) =>
      request.url === '/api/appointments' && request.params.get('page') === '1');
    expect(first.request.params.get('pageSize')).toBe('100');
    first.flush({
      page: 1, pageSize: 1, total: 2,
      items: [{ id: 'mine', userId: 'demo-user' }]
    });

    const second = http.expectOne((request) => request.params.get('page') === '2');
    second.flush({
      page: 2, pageSize: 1, total: 2,
      items: [{ id: 'other', userId: 'other-user' }]
    });

    expect(resultIds).toEqual(['mine']);
    http.verify();
  });
});
