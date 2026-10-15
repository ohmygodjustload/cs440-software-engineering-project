import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Appointment } from '../models/appointment';
import { HomeService } from './home.service';

describe('HomeService', () => {
  it('loads the signed-in client bookings from /api/appointments/mine', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const http = TestBed.inject(HttpTestingController);
    const service = TestBed.inject(HomeService);
    const mine = [{ id: 'mine', status: 'Booked', userId: '6abc20bda313dfdf8ecc0286' }] as Appointment[];
    let actual: Appointment[] | undefined;

    service.loadAppointments().subscribe((items) => (actual = items));

    const request = http.expectOne('/api/appointments/mine');
    expect(request.request.method).toBe('GET');
    request.flush(mine);
    http.verify();

    expect(actual).toEqual(mine);
  });
});
