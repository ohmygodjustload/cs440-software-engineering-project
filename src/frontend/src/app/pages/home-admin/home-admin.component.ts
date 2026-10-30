import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { ProviderRequest } from '../../core/models/provider-request';
import { ProviderRequestsService } from '../../core/services/provider-requests.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

export interface AdminReviewItem {
  id: string;
  name: string;
  categories: string;
}

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning, Admin.';
  if (hour < 17) return 'Good afternoon, Admin.';
  return 'Good evening, Admin.';
}

@Component({
  selector: 'app-home-admin',
  standalone: true,
  imports: [DatePipe, RouterLink, LoadingComponent],
  templateUrl: './home-admin.component.html',
  styleUrl: './home-admin.component.css',
})
export class HomeAdminComponent implements OnInit {
  private readonly service = inject(ProviderRequestsService);
  private readonly destroyRef = inject(DestroyRef);

  now = new Date();
  loading = true;
  error: string | null = null;

  pendingApprovals = 0;
  reviews: AdminReviewItem[] = [];

  get greeting(): string {
    return greetingFor(this.now);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.now = new Date();

    this.service.list('pending')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (requests) => {
          this.pendingApprovals = requests.length;
          this.reviews = requests.slice(0, 4).map((request) => this.toReviewItem(request));
          this.loading = false;
        },
        error: () => {
          this.error = 'Could not load the admin overview.';
          this.loading = false;
        }
      });
  }

  private toReviewItem(request: ProviderRequest): AdminReviewItem {
    return {
      id: request.id,
      name: request.providerName,
      categories: request.serviceTypes?.length ? request.serviceTypes.join(', ') : 'Not specified'
    };
  }
}
