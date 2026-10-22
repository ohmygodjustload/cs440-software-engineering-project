import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { ProviderRequestsService } from '../../core/services/provider-requests.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

import {
  ConfirmationPromptComponent,
  ConfirmationAction,
  ConfirmationDecision
} from '../confirmation/confirmation.component';

/**
 * review-request.component.ts — the admin review screen for one provider request.
 *
 * Reached from the Requests page via /review-request?id=... . Loads the request,
 * shows the applicant's name, categories, and submitted qualifications, and lets
 * the admin approve or reject with an optional note (BAAAM-138 / BAAAM-144).
 */
@Component({
  selector: 'app-credential-review',
  standalone: true,
  imports: [FormsModule, RouterLink, ConfirmationPromptComponent, LoadingComponent],
  templateUrl: './review-request.component.html',
  styleUrls: ['./review-request.component.css'],
})
export class ReviewRequestComponent implements OnInit {
  private readonly service = inject(ProviderRequestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  request: ProviderRequest | null = null;
  loading = true;
  error: string | null = null;
  submitting = false;
  comments = '';

  /** Local layout state passed down into the confirmation dialog. */
  currentAction: ConfirmationAction = 'accept';

  @ViewChild('confirmationPrompt') private dialogComponent?: ConfirmationPromptComponent;

  ngOnInit(): void {
    this.load(this.route.snapshot.queryParamMap.get('id'));
  }

  load(id: string | null): void {
    if (!id) {
      this.loading = false;
      this.error = 'No provider request was selected. Return to Requests and pick one to review.';
      return;
    }

    this.loading = true;
    this.error = null;

    this.service.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (request) => {
          this.request = request;
          this.comments = request.notes ?? '';
          this.loading = false;
        },
        error: () => {
          this.error = 'This provider request could not be loaded.';
          this.loading = false;
        }
      });
  }

  get isReviewed(): boolean {
    return this.request?.isReviewed ?? false;
  }

  get statusLabel(): string {
    if (!this.request?.isReviewed) {
      return 'Pending review';
    }

    return this.request.isApproved ? 'Approved' : 'Rejected';
  }

  /** True when the applicant selected the given category. */
  hasCategory(category: 'Medical' | 'Beauty' | 'Fitness'): boolean {
    return this.request?.serviceTypes?.includes(category) ?? false;
  }

  /** Prepares the dialog and opens it for approve or reject. */
  openDialog(type: 'approve' | 'reject'): void {
    if (this.submitting || this.isReviewed) {
      return;
    }

    this.currentAction = type === 'approve' ? 'accept' : 'reject';
    this.dialogComponent?.open();
  }

  /** Runs once the admin confirms inside the dialog. */
  handleDialogConfirmed(decisionData: ConfirmationDecision): void {
    this.submit(decisionData.action === 'accept' ? 'approve' : 'reject');
  }

  private submit(decision: 'approve' | 'reject'): void {
    if (this.submitting || !this.request || this.isReviewed) {
      return;
    }

    this.submitting = true;
    this.error = null;

    const call = decision === 'approve'
      ? this.service.approve(this.request.id, this.comments)
      : this.service.reject(this.request.id, this.comments);

    call
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reviewed) => {
          this.request = reviewed;
          this.submitting = false;
          void this.router.navigate(['/requests'], {
            queryParams: { reviewed: reviewed.id, outcome: decision }
          });
        },
        error: () => {
          this.error = `The request could not be ${decision}d. Please try again.`;
          this.submitting = false;
        }
      });
  }
}
