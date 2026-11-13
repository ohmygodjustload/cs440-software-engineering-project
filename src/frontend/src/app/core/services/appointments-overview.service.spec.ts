import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Appointment } from '../models/appointment';
import { AppointmentsOverviewService } from './appointments-overview.service';

describe('AppointmentsOverviewService', () => {
  let service: AppointmentsOverviewService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AppointmentsOverviewService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads the signed-in client bookings from /api/appointments/mine', () => {
    const mine = [{ id: 'a1', status: 'Booked', userId: '6abc20bda313dfdf8ecc0286' }] as Appointment[];
    let actual: Appointment[] | undefined;

    service.loadAppointments().subscribe((items) => (actual = items));

    const request = httpTesting.expectOne('/api/appointments/mine');
    expect(request.request.method).toBe('GET');
    request.flush(mine);

    expect(actual).toEqual(mine);
  });

  it('PATCHes notes on /api/appointments/{id}/notes', () => {
    const updated = { id: 'a1', notes: 'bring forms', title: 'Checkup', startDateTime: '2030-01-01T10:00:00Z' } as Appointment;
    let actual: Appointment | undefined;

    service.updateNotes('a1', 'bring forms').subscribe((item) => (actual = item));

    const request = httpTesting.expectOne('/api/appointments/a1/notes');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ notes: 'bring forms' });
    request.flush(updated);

    expect(actual).toEqual(updated);
  });

  it('POSTs cancel to /api/appointments/{id}/cancel', () => {
    const released = { id: 'a1', status: 'Available', userId: null } as Appointment;
    let actual: Appointment | undefined;

    service.cancelBooking('a1', 'Checkup').subscribe((item) => (actual = item));

    const request = httpTesting.expectOne('/api/appointments/a1/cancel');
    expect(request.request.method).toBe('POST');
    request.flush(released);

    expect(actual).toEqual(released);
  });
});
