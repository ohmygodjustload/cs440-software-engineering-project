import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { RequestsComponent } from './requests.component';

const openRequest: ProviderRequest = {
  id: 'pr-101',
  userId: 'user-1',
  providerName: 'Brendan Lambrecht',
  serviceTypes: ['Fitness'],
  fitnessCredentials: { info: 'CPT, Fitness Institute' },
  isReviewed: false,
  isApproved: false,
  notes: '',
  submittedAt: '2026-10-01T10:00:00Z'
};

const closedRequest: ProviderRequest = {
  id: 'pr-102',
  userId: 'user-2',
  providerName: 'Maya Chen',
  serviceTypes: ['Beauty', 'Fitness'],
  beautyCredentials: { info: 'Cosmetology license CA-1' },
  isReviewed: true,
  isApproved: false,
  notes: 'License could not be verified.',
  submittedAt: '2026-09-20T09:00:00Z',
  reviewedAt: '2026-09-21T09:00:00Z'
};

describe('RequestsComponent', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let component: RequestsComponent;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  function flushLists(open: ProviderRequest[] = [openRequest], closed: ProviderRequest[] = [closedRequest]): void {
    httpTesting.expectOne((req) => req.url === '/api/provider-requests' && req.params.get('status') === 'pending')
      .flush(open);
    httpTesting.expectOne((req) => req.url === '/api/provider-requests' && req.params.get('status') === 'closed')
      .flush(closed);
    fixture.detectChanges();
  }

  it('should create', () => {
    flushLists();

    expect(component).toBeTruthy();
  });

  it('loads both logs from the API', () => {
    flushLists();

    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.requests.length).toBe(1);
    expect(component.closedRequests.length).toBe(1);
  });

  it('renders the heading, open log, and closed log', () => {
    flushLists();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.greeting h1')?.textContent).toContain('Requests');
    expect(el.textContent).toContain('Open requests');
    expect(el.textContent).toContain('Closed requests');
    expect(el.textContent).toContain('Brendan Lambrecht');
    expect(el.textContent).toContain('Categories: Fitness');
    expect(el.textContent).toContain('CPT, Fitness Institute');
    expect(el.textContent).toContain('Maya Chen');
    expect(el.textContent).toContain('Rejected');
    expect(el.textContent).toContain('Note: License could not be verified.');
  });

  it('links each Review action to the review screen with the request id', () => {
    flushLists();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.open-list .request-card .primary')
    ) as HTMLAnchorElement[];

    expect(links.length).toBe(1);
    expect(links[0].textContent?.trim()).toBe('Review');
    expect(links[0].getAttribute('href')).toContain('/review-request');
    expect(links[0].getAttribute('href')).toContain('id=pr-101');
  });

  it('shows an error state and retries on Try again', () => {
    httpTesting.expectOne((req) => req.params.get('status') === 'pending')
      .flush('boom', { status: 500, statusText: 'Server Error' });
    httpTesting.expectOne((req) => req.params.get('status') === 'closed')
      .flush([]);

    fixture.detectChanges();
    expect(component.error).toBe('Could not load provider requests.');

    fixture.nativeElement.querySelector('.error button')?.click();
    fixture.detectChanges();
    expect(component.error).toBeNull();
    expect(component.loading).toBeTrue();

    flushLists();
    expect(fixture.nativeElement.textContent).toContain('Brendan Lambrecht');
  });

  it('shows empty copy when there are no requests', () => {
    flushLists([], []);

    expect(fixture.nativeElement.textContent).toContain('No pending provider requests.');
    expect(fixture.nativeElement.textContent).toContain('No closed provider requests yet.');
  });

  it('shows only the latest five closed requests', () => {
    const many: ProviderRequest[] = Array.from({ length: 7 }, (_, index) => ({
      ...closedRequest,
      id: `pr-2${index}`,
      providerName: `Provider ${index + 1}`
    }));

    flushLists([], many);

    // Full list is fetched, but only the newest five render.
    expect(component.closedRequests.length).toBe(7);
    expect(component.visibleClosedRequests.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Provider 1');
    expect(fixture.nativeElement.textContent).toContain('Provider 5');
    expect(fixture.nativeElement.textContent).not.toContain('Provider 6');
    expect(fixture.nativeElement.textContent).not.toContain('Provider 7');
    expect(fixture.nativeElement.querySelectorAll('.closed-list .request-card').length).toBe(5);
  });
});

describe('RequestsComponent after a decision', () => {
  let fixture: ComponentFixture<RequestsComponent>;
  let component: RequestsComponent;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RequestsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ outcome: 'approve' }) } }
        }
      ],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RequestsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpTesting.expectOne((req) => req.params.get('status') === 'pending').flush([]);
    httpTesting.expectOne((req) => req.params.get('status') === 'closed').flush([]);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  it('shows a success banner when redirected with outcome=approve', () => {
    expect(component.successMessage).toContain('Request approved.');
    expect(fixture.nativeElement.querySelector('.success')?.textContent)
      .toContain('Request approved.');
  });
});
