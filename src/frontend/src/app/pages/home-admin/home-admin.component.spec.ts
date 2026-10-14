import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { HomeAdminComponent, greetingFor } from './home-admin.component';

const pending: ProviderRequest[] = [
  {
    id: 'pr-104',
    userId: 'user-4',
    providerName: 'Ava Brooks',
    serviceTypes: ['Beauty', 'Fitness'],
    isReviewed: false,
    isApproved: false,
    notes: '',
    submittedAt: '2026-09-22T09:00:00Z'
  },
  {
    id: 'pr-105',
    userId: 'user-5',
    providerName: 'Sally Smith',
    serviceTypes: ['Medical'],
    isReviewed: false,
    isApproved: false,
    notes: '',
    submittedAt: '2026-09-22T09:30:00Z'
  }
];

describe('greetingFor', () => {
  it('returns morning before noon', () => {
    expect(greetingFor(new Date(2026, 8, 22, 9, 0))).toBe('Good morning, Admin');
  });

  it('returns afternoon from 12:00 to 16:59', () => {
    expect(greetingFor(new Date(2026, 8, 22, 14, 0))).toBe('Good afternoon, Admin');
  });

  it('returns evening from 17:00', () => {
    expect(greetingFor(new Date(2026, 8, 22, 19, 0))).toBe('Good evening, Admin');
  });
});

describe('AdminHomeComponent', () => {
  let fixture: ComponentFixture<HomeAdminComponent>;
  let component: HomeAdminComponent;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeAdminComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(HomeAdminComponent);
    component = fixture.componentInstance;
    // ngOnInit runs load() during the first detectChanges, which clobbers `now`.
    // Set a deterministic test time after that, before the template renders.
    fixture.detectChanges();
    component.now = new Date(2026, 8, 22, 9, 0);
    fixture.detectChanges();
    httpTesting.expectOne(
      (req) => req.url === '/api/provider-requests' && req.params.get('status') === 'pending'
    )
      .flush(pending);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads pending approvals from the provider requests API', () => {
    expect(component.loading).toBeFalse();
    expect(component.error).toBeNull();
    expect(component.pendingApprovals).toBe(2);
    expect(component.reviews.length).toBe(2);
  });

  it('renders greeting, date, and the pending summary', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.greeting h1')?.textContent).toContain('Good morning, Admin');
    expect(el.querySelector('.greeting p')?.textContent).toContain('Tuesday, September 22, 2026');
    expect(el.textContent).toContain('Pending approvals');
    expect(el.textContent).toContain('2');
  });

  it('renders review rows and the review CTA', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Ava Brooks');
    expect(el.textContent).toContain('Requested Categories: Beauty, Fitness');
    expect(el.textContent).toContain('Sally Smith');
    expect(el.textContent).toContain('Review Provider Requests');
  });

  it('shows an error state and retries on Try again', () => {
    component.loading = false;
    component.error = 'Could not load the admin overview.';
    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('Could not load the admin overview.');

    fixture.nativeElement.querySelector('button')?.click();
    fixture.detectChanges();
    httpTesting.expectOne((req) => req.params.get('status') === 'pending').flush([]);
    fixture.detectChanges();

    expect(component.error).toBeNull();
    expect(component.loading).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Needs your review');
  });

  it('shows empty copy when there is nothing to review', () => {
    component.loading = false;
    component.error = null;
    component.pendingApprovals = 0;
    component.reviews = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No provider requests need review.');
  });
});