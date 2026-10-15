import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Appointment } from '../models/appointment';
import { AppointmentsOverviewService } from './appointments-overview.service';

describe('AppointmentsOverviewService', () => {
  it('loads the signed-in client bookings from /api/appointments/mine', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    const service = TestBed.inject(AppointmentsOverviewService);
    const httpTesting = TestBed.inject(HttpTestingController);
    const mine = [{ id: 'a1', status: 'Booked', userId: '6abc20bda313dfdf8ecc0286' }] as Appointment[];
    let actual: Appointment[] | undefined;

    service.loadAppointments().subscribe((items) => (actual = items));

    const request = httpTesting.expectOne('/api/appointments/mine');
    expect(request.request.method).toBe('GET');
    request.flush(mine);
    httpTesting.verify();

    expect(actual).toEqual(mine);
  });
});
