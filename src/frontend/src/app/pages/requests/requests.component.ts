import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { ProviderRequestsService } from '../../core/services/provider-requests.service';

/** How many of the most recent closed requests the UI shows. */
const CLOSED_REQUESTS_LIMIT = 5;

/**
 * requests.component.ts — the admin Requests page.
 *
 * Shows the two approval logs side by side: requests that are still open (to be
 * reviewed) and the closed log of already approved/rejected requests. Each row
 * shows the provider's name, requested categories, and submitted qualifications;
 * open rows link to the review screen (BAAAM-138 / BAAAM-144).
 */
@Component({
  selector: 'app-arequests',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './requests.component.html',
  styleUrl: './requests.component.css',
})
export class RequestsComponent implements OnInit {
  private readonly service = inject(ProviderRequestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  loading = true;
  error: string | null = null;
  /** Banner shown after the review screen records a decision. */
  successMessage: string | null = null;

  /** Open log: requests waiting on review. */
  requests: ProviderRequest[] = [];

  /** Closed log: requests already approved or rejected. */
  closedRequests: ProviderRequest[] = [];

  ngOnInit(): void {
    const outcome = this.route.snapshot.queryParamMap.get('outcome');
    if (outcome === 'approve' || outcome === 'reject') {
      this.successMessage = outcome === 'approve'
        ? 'Request approved. The provider can now sign in and create appointments.'
        : 'Request rejected. The provider stays blocked and sees your note when they try to sign in.';
    }

    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;

    let pendingDone = false;
    let closedDone = false;
    const fail = (error: unknown) => {
      this.error = 'Could not load provider requests.';
      this.loading = false;
    };
    const settle = () => {
      if (pendingDone && closedDone) {
        this.loading = false;
      }
    };

    this.service.list('pending')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.requests = items;
          pendingDone = true;
          settle();
        },
        error: fail
      });

    this.service.list('closed')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.closedRequests = items;
          closedDone = true;
          settle();
        },
        error: fail
      });
  }

  /**
   * Closed log for the template: the most recent entries only, so the page
   * stays short. The full list is kept on `closedRequests`.
   */
  get visibleClosedRequests(): ProviderRequest[] {
    return this.closedRequests.slice(0, CLOSED_REQUESTS_LIMIT);
  }

  /** "Medical, Fitness" style summary of the requested service categories. */
  categoriesOf(request: ProviderRequest): string {
    return request.serviceTypes?.length ? request.serviceTypes.join(', ') : 'Not specified';
  }

  /** First submitted qualification matching the requested categories, for the row summary. */
  qualificationsOf(request: ProviderRequest): string {
    const infos = [request.medicalCredentials, request.beautyCredentials, request.fitnessCredentials]
      .map((credential) => credential?.info?.trim())
      .filter((info): info is string => !!info);

    return infos.length ? infos.join(' · ') : 'No qualifications submitted.';
  }

  outcomeOf(request: ProviderRequest): string {
    return request.isApproved ? 'Approved' : 'Rejected';
  }
}