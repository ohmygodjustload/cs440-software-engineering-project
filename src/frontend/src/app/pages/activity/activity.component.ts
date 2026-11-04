import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingComponent } from '../../core/components/loading/loading.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';

interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  message: string;
}

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly notificationsService = inject(NotificationsService);
  entries: ActivityEntry[] = [];
  filteredEntries: ActivityEntry[] = [];
  loading = false;
  error: string | null = null;
  readonly pageSize = 10;
  currentPage = 1;
  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true })
  });

  ngOnInit(): void {
    this.markNotificationsRead();
    this.loadActivity();
    this.searchForm.valueChanges.subscribe(() => this.filterEntries());
  }

  private markNotificationsRead(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.isAdmin) return;
    this.notificationsService.markAllRead(user.id).subscribe({
      error: () => undefined
    });
  }

  loadActivity(): void {
    this.loading = true;
    this.error = null;
    this.http.get<ActivityEntry[]>('/api/admin/activity').subscribe({
      next: (entries) => {
        this.entries = entries ?? [];
        this.filterEntries();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load activity.';
        this.loading = false;
      }
    });
  }

  filterEntries(): void {
    const search = this.searchForm.controls.search.value.trim().toLowerCase();
    this.filteredEntries = this.entries.filter((entry) =>
      !search || `${entry.action} ${entry.message}`.toLowerCase().includes(search));
    this.currentPage = 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEntries.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  get paginatedEntries(): ActivityEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  selectPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
}
