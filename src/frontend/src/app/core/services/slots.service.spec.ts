import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SlotsService } from './slots.service';

describe('SlotsService', () => {
  it('reports unavailable publishing without creating a booked appointment', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(SlotsService);
    const http = TestBed.inject(HttpTestingController);
    let failed = false;
    service.publish({
      title: 'Physical', category: 'Medical', providerId: 'p-1',
      startDateTime: '2030-01-01T10:00:00Z', endDateTime: '2030-01-01T11:00:00Z',
      location: '', notes: ''
    }).subscribe({ error: () => failed = true });
    expect(failed).toBeTrue();
    http.expectNone(() => true);
    http.verify();
  });
});
