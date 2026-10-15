/**
 * slots.service.spec.ts — unit tests for SlotsService.
 *
 * Proves create, getMine, getAvailable, update, and delete hit /api/slots with the right method and body,
 * book posts to /api/slots/{id}/book, and getMyBookings reads /api/appointments/mine.
 *
 * None of this needs a running backend.
 */

import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';

import {BookedAppointment, Slot} from '../models/slot';
import {SlotsService} from './slots.service';

describe('SlotsService', () => {
  const slot: Slot = {
    id: 's1',
    title: 'General checkup',
    category: 'Medical',
    startDateTime: '2027-01-01T10:00:00Z',
    endDateTime: '2027-01-01T10:30:00Z',
    providerId: '6abc1939a313dfdf8ecc0265',
    providerName: 'John Smith',
    userId: null,
    appointmentTypeId: 't1',
    location: '1 Main St, Chicago, IL, 60601',
    notes: '',
    status: 'Available'
  };

  const booking: BookedAppointment = {
    ...slot, status: 'Booked', userId: '6abc20bda313dfdf8ecc0286', notes: 'First visit'
  };

  it('should POST /api/slots/{id}/book with the trimmed notes and emit the booking', () => {
    let actual: BookedAppointment | undefined;

    service.book('s1', '  First visit  ').subscribe((b) => (actual = b));

    const request = httpTesting.expectOne('/api/slots/s1/book');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({notes: 'First visit'});
    request.flush(booking);

    expect(actual).toEqual(booking);
  });

  it('should POST an empty body when booking without notes', () => {
    service.book('s1').subscribe();

    const request = httpTesting.expectOne('/api/slots/s1/book');
    expect(request.request.body).toEqual({});
    request.flush(booking);
  });

  it('should surface a 409 when the slot was already taken', () => {
    let status: number | undefined;

    service.book('s1').subscribe({error: (e) => (status = e.status)});
    httpTesting.expectOne('/api/slots/s1/book').flush('Slot is no longer available.', {
      status: 409,
      statusText: 'Conflict'
    });

    expect(status).toBe(409);
  });

  it('should GET /api/appointments/mine and emit the client bookings', () => {
    let actual: BookedAppointment[] | undefined;

    service.getMyBookings().subscribe((b) => (actual = b));

    const request = httpTesting.expectOne('/api/appointments/mine');
    expect(request.request.method).toBe('GET');
    request.flush([booking]);

    expect(actual).toEqual([booking]);
  });

  let service: SlotsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(SlotsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should POST /api/slots and emit the created slot', () => {
    const dto = {appointmentTypeId: 't1', startTime: '2027-01-01T10:00:00Z'};
    let actual: Slot | undefined;

    service.create(dto).subscribe((created) => (actual = created));

    const request = httpTesting.expectOne('/api/slots');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(dto);
    request.flush(slot);

    expect(actual).toEqual(slot);
  });

  it('should GET /api/slots/mine and emit the provider slots', () => {
    let actual: Slot[] | undefined;

    service.getMine().subscribe((slots) => (actual = slots));

    const request = httpTesting.expectOne('/api/slots/mine');
    expect(request.request.method).toBe('GET');
    request.flush([slot]);

    expect(actual).toEqual([slot]);
  });

  it('should GET /api/slots with no query string when no filters are given', () => {
    let actual: Slot[] | undefined;

    service.getAvailable().subscribe((slots) => (actual = slots));

    const request = httpTesting.expectOne('/api/slots');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush([slot]);

    expect(actual).toEqual([slot]);
  });

  it('should send only the filters that are set to GET /api/slots', () => {
    service.getAvailable({
      category: 'Beauty',
      providerId: '6abc1939a313dfdf8ecc0265',
      from: '2027-01-01T00:00:00Z',
      to: ''
    }).subscribe();

    const request = httpTesting.expectOne((r) => r.url === '/api/slots');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('category')).toBe('Beauty');
    expect(request.request.params.get('providerId')).toBe('6abc1939a313dfdf8ecc0265');
    expect(request.request.params.get('from')).toBe('2027-01-01T00:00:00Z');
    expect(request.request.params.has('to')).toBeFalse();
    request.flush([]);
  });

  it('should PUT /api/slots/{id} and emit the updated slot', () => {
    const dto = {startTime: '2027-01-01T11:00:00Z'};
    let actual: Slot | undefined;

    service.update('s1', dto).subscribe((updated) => (actual = updated));

    const request = httpTesting.expectOne('/api/slots/s1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(dto);
    request.flush({...slot, startDateTime: dto.startTime});

    expect(actual?.startDateTime).toBe(dto.startTime);
  });

  it('should DELETE /api/slots/{id}', () => {
    let completed = false;

    service.delete('s1').subscribe(() => (completed = true));

    const request = httpTesting.expectOne('/api/slots/s1');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);

    expect(completed).toBeTrue();
  });

  it('should surface an error when the backend rejects the request', () => {
    let failed = false;

    service.getMine().subscribe({error: () => (failed = true)});
    httpTesting.expectOne('/api/slots/mine').flush('Slot is no longer available.', {
      status: 409,
      statusText: 'Conflict'
    });

    expect(failed).toBeTrue();
  });

  it('reports unavailable publishing without creating a booked appointment', () => {
    let failed = false;

    service.publish({
      title: 'Physical',
      category: 'Medical',
      providerId: 'p-1',
      startDateTime: '2030-01-01T10:00:00Z',
      endDateTime: '2030-01-01T11:00:00Z',
      location: '',
      notes: ''
    }).subscribe({error: () => (failed = true)});

    expect(failed).toBeTrue();
    httpTesting.expectNone(() => true);
  });
});
