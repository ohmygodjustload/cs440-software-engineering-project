import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ProviderRequest } from '../models/provider-request';
import { ProviderRequestsService } from './provider-requests.service';

const sample: ProviderRequest = {
  id: 'pr-1',
  userId: 'user-1',
  providerName: 'Ava Brooks',
  serviceTypes: ['Beauty'],
  isReviewed: false,
  isApproved: false,
  notes: '',
  submittedAt: '2026-10-01T10:00:00Z'
};

describe('ProviderRequestsService', () => {
  let service: ProviderRequestsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ProviderRequestsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('lists the pending log by default', () => {
    let actual: ProviderRequest[] | undefined;
    service.list().subscribe((items) => (actual = items));

    const request = httpTesting.expectOne(
      (req) => req.url === '/api/provider-requests' && req.params.get('status') === 'pending'
    );
    expect(request.request.method).toBe('GET');
    request.flush([sample]);

    expect(actual).toEqual([sample]);
  });

  it('lists the closed log on demand', () => {
    service.list('closed').subscribe();

    httpTesting.expectOne(
      (req) => req.url === '/api/provider-requests' && req.params.get('status') === 'closed'
    ).flush([]);
  });

  it('fetches a single request by id', () => {
    let actual: ProviderRequest | undefined;
    service.getById('pr-1').subscribe((item) => (actual = item));

    const request = httpTesting.expectOne('/api/provider-requests/pr-1');
    expect(request.request.method).toBe('GET');
    request.flush(sample);

    expect(actual?.id).toBe('pr-1');
  });

  it('posts approve with trimmed notes', () => {
    service.approve('pr-1', '  Verified.  ').subscribe();

    const request = httpTesting.expectOne('/api/provider-requests/pr-1/approve');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ notes: 'Verified.' });
    request.flush({ ...sample, isReviewed: true, isApproved: true });
  });

  it('posts reject with a null note when the text is blank', () => {
    service.reject('pr-1', '   ').subscribe();

    const request = httpTesting.expectOne('/api/provider-requests/pr-1/reject');
    expect(request.request.body).toEqual({ notes: null });
    request.flush({ ...sample, isReviewed: true, isApproved: false });
  });
});