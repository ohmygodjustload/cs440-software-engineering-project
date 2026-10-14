import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { ReviewRequestComponent } from './review-request.component';

const pendingRequest: ProviderRequest = {
  id: 'pr-101',
  userId: 'user-1',
  providerName: 'Ava Brooks',
  serviceTypes: ['Beauty', 'Fitness'],
  beautyCredentials: { info: 'DEMO-COS-104' },
  fitnessCredentials: { info: 'DEMO-FIT-208' },
  isReviewed: false,
  isApproved: false,
  notes: '',
  submittedAt: '2026-10-01T10:00:00Z'
};

describe('ReviewRequestComponent', () => {
  let fixture: ComponentFixture<ReviewRequestComponent>;
  let component: ReviewRequestComponent;
  let element: HTMLElement;
  let httpTesting: HttpTestingController;
  let router: Router;

  function configure(id: string | null): void {
    TestBed.configureTestingModule({
      imports: [ReviewRequestComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(id ? { id } : {}) } }
        }
      ]
    });
  }

  beforeEach(async () => {
    configure('pr-101');
    await TestBed.compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ReviewRequestComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement as HTMLElement;

    fixture.detectChanges();
    httpTesting.expectOne('/api/provider-requests/pr-101').flush(pendingRequest);
    fixture.detectChanges();
  });

  afterEach(() => httpTesting.verify());

  it('loads the request and renders name, categories, and qualifications', () => {
    expect(component.loading).toBeFalse();
    expect(component.request?.providerName).toBe('Ava Brooks');

    expect(element.querySelector('h1')?.textContent).toContain('Review Ava Brooks');
    expect(element.textContent).toContain('Pending review');
    expect(element.textContent).toContain('DEMO-COS-104');
    expect(element.textContent).toContain('DEMO-FIT-208');
    // Medical was not requested, so its card stays hidden.
    expect(element.querySelector('#medical-heading')).toBeNull();
  });

  it('updates comments via the textarea', async () => {
    const textarea = element.querySelector('textarea')!;
    textarea.value = 'Credentials reviewed.';
    textarea.dispatchEvent(new Event('input'));

    await fixture.whenStable();

    expect(component.comments).toBe('Credentials reviewed.');
  });

  it('approves the request through the confirmation dialog and navigates back', () => {
    component.comments = 'Verified.';
    component.openDialog('approve');
    component.handleDialogConfirmed({ action: 'accept', personName: 'Ava Brooks' });

    const post = httpTesting.expectOne('/api/provider-requests/pr-101/approve');
    expect(post.request.body).toEqual({ notes: 'Verified.' });
    post.flush({ ...pendingRequest, isReviewed: true, isApproved: true, notes: 'Verified.' });

    expect(router.navigate).toHaveBeenCalledWith(
      ['/requests'],
      { queryParams: { reviewed: 'pr-101', outcome: 'approve' } }
    );
  });

  it('rejects the request with the comment as the reason', () => {
    component.comments = 'License not verifiable.';
    component.openDialog('reject');
    component.handleDialogConfirmed({ action: 'reject', personName: 'Ava Brooks' });

    const post = httpTesting.expectOne('/api/provider-requests/pr-101/reject');
    expect(post.request.body).toEqual({ notes: 'License not verifiable.' });
    post.flush({ ...pendingRequest, isReviewed: true, isApproved: false });
  });

  it('disables decisions while submitting', () => {
    component.submitting = true;
    fixture.detectChanges();

    expect(element.querySelector<HTMLButtonElement>('.approve')!.disabled).toBeTrue();
    expect(element.querySelector<HTMLButtonElement>('.reject')!.disabled).toBeTrue();

    component.openDialog('approve');
    component.handleDialogConfirmed({ action: 'accept', personName: 'Ava Brooks' });

    httpTesting.expectNone((req) => req.url.includes('/approve'));
  });

  it('hides decision actions for an already reviewed request', () => {
    component.load('pr-101');
    httpTesting.expectOne('/api/provider-requests/pr-101')
      .flush({ ...pendingRequest, isReviewed: true, isApproved: false, notes: 'Missing license.' } as ProviderRequest);
    fixture.detectChanges();

    expect(element.textContent).toContain('Rejected');
    expect(element.textContent).toContain('Missing license.');
    expect(element.querySelector('.approve')).toBeNull();
    expect(element.querySelector('.reject')).toBeNull();
  });

  it('shows an error when no request id was supplied', async () => {
    TestBed.resetTestingModule();
    configure(null);
    await TestBed.compileComponents();

    httpTesting = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReviewRequestComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(element.textContent).toContain('No provider request was selected.');
    httpTesting.expectNone('/api/provider-requests/undefined');
  });
});
