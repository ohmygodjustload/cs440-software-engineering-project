/**
 * slots.service.spec.ts — unit tests for SlotsService.
 *
 * Proves create, getMine, update, and delete hit /api/slots with the right method and body.
 * None of this needs a running backend.
 */

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Slot } from '../models/slot';
import { SlotsService } from './slots.service';

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
    const dto = { appointmentTypeId: 't1', startTime: '2027-01-01T10:00:00Z' };
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

  it('should PUT /api/slots/{id} and emit the updated slot', () => {
    const dto = { startTime: '2027-01-01T11:00:00Z' };
    let actual: Slot | undefined;

    service.update('s1', dto).subscribe((updated) => (actual = updated));

    const request = httpTesting.expectOne('/api/slots/s1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(dto);
    request.flush({ ...slot, startDateTime: dto.startTime });

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

    service.getMine().subscribe({ error: () => (failed = true) });
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
    }).subscribe({ error: () => (failed = true) });

    expect(failed).toBeTrue();
    httpTesting.expectNone(() => true);
  });
});
