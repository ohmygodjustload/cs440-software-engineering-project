import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  it('requests an ISO date range from the calendar endpoint', () => {
    TestBed.configureTestingModule({ 
      providers: [
        provideHttpClient(), 
        provideHttpClientTesting()
      ] 
    });

    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(CalendarService);

    const from = new Date('2026-08-30T05:00:00Z');
    const to = new Date('2026-10-04T05:00:00Z');

    service.getItems(from, to).subscribe(items => {
      expect(items).toEqual([]);
    })

    const request = http.expectOne(
      req => req.url === '/api/calendar'
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('from')).toBe(from.toISOString());
    expect(request.request.params.get('to')).toBe(to.toISOString());
    
    request.flush([]);
    http.verify();
  });
});
