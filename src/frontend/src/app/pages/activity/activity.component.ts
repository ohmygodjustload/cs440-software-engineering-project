import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingComponent } from '../../core/components/loading/loading.component';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { AppointmentAuditService } from '../../core/services/appointment-audit.service';
import { AppointmentAuditListItem } from '../../core/models/appointment-audit';

interface ActivityEntry {
  id: string;
  timestamp: string;
  action: string;
  message: string;
  isRead: boolean;
}

type ActivityTab = 'feed' | 'audit';

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
  private readonly auditService = inject(AppointmentAuditService);

  activeTab: ActivityTab = 'feed';
  entries: ActivityEntry[] = [];
  filteredEntries: ActivityEntry[] = [];
  auditEntries: AppointmentAuditListItem[] = [];
  loading = false;
  error: string | null = null;
  markAllReadError: string | null = null;
  markAllReadSaving = false;
  readonly pageSize = 10;
  currentPage = 1;
  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true })
  });
  readonly auditForm = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
    action: new FormControl('', { nonNullable: true })
  });

  readonly auditActions = ['CREATED', 'RESCHEDULED', 'STATUS_CHANGE', 'CANCELLED'];

  ngOnInit(): void {
    this.loadActivity();
    this.searchForm.valueChanges.subscribe(() => this.filterEntries());
  }

  get unreadCount(): number {
    return this.entries.filter((entry) => !entry.isRead).length;
  }

  selectTab(tab: ActivityTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.currentPage = 1;
    this.error = null;
    if (tab === 'feed') this.loadActivity();
    else this.loadAudit();
  }

  markAllRead(): void {
    const user = this.authService.getCurrentUser();
    if (!user?.isAdmin || this.markAllReadSaving || this.unreadCount === 0) return;

    this.markAllReadSaving = true;
    this.markAllReadError = null;
    this.notificationsService.markAllRead(user.id).subscribe({
      next: () => {
        this.entries = this.entries.map((entry) => ({ ...entry, isRead: true }));
        this.filterEntries();
        this.markAllReadSaving = false;
      },
      error: () => {
        this.markAllReadError = 'Failed to mark notifications as read.';
        this.markAllReadSaving = false;
      }
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

  loadAudit(): void {
    this.loading = true;
    this.error = null;
    const from = this.auditForm.controls.from.value;
    const to = this.auditForm.controls.to.value;
    const action = this.auditForm.controls.action.value;
    this.auditService.list({
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
      action: action || undefined
    }).subscribe({
      next: (entries) => {
        this.auditEntries = entries ?? [];
        this.currentPage = 1;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load appointment audit.';
        this.loading = false;
      }
    });
  }

  filterEntries(): void {
    const search = this.searchForm.controls.search.value.trim().toLowerCase();
    const selectedDate = this.searchForm.controls.startDate.value;
    const selectedDateStr = selectedDate ? selectedDate.slice(0, 10) : null;
    this.filteredEntries = this.entries.filter((entry) => {
      const matchesSearch = !search || `${entry.action} ${entry.message}`.toLowerCase().includes(search);
      const matchesDate = !selectedDateStr || entry.timestamp.slice(0, 10) === selectedDateStr;
      return matchesSearch && matchesDate;
    });
    this.currentPage = 1;
  }

  get totalPages(): number {
    const count = this.activeTab === 'feed' ? this.filteredEntries.length : this.auditEntries.length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  }

  get pageNumbers(): number[] {
    if (this.totalPages <= 10) {
      return Array.from({ length: this.totalPages }, (_, index) => index + 1);
    }

    const pageGroupSize = 10;
    const currentGroup = Math.ceil(this.currentPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    const endPage = Math.min(startPage + pageGroupSize - 1, this.totalPages);

    return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index);
  }

  get showPrevious(): boolean {
    if (this.totalPages <= 10) return false;
    const pageGroupSize = 10;
    const currentGroup = Math.ceil(this.currentPage / pageGroupSize);
    return currentGroup > 1;
  }

  get showNext(): boolean {
    if (this.totalPages <= 10) return false;
    const pageGroupSize = 10;
    const currentGroup = Math.ceil(this.currentPage / pageGroupSize);
    const startPage = (currentGroup - 1) * pageGroupSize + 1;
    return startPage + pageGroupSize < this.totalPages;
  }

  previousPage(): void {
    if (this.showPrevious) {
      const pageGroupSize = 10;
      const currentGroup = Math.ceil(this.currentPage / pageGroupSize);
      const newGroup = currentGroup - 1;
      this.currentPage = Math.max((newGroup - 1) * pageGroupSize + 1, 1);
    }
  }

  nextPage(): void {
    if (this.showNext) {
      const pageGroupSize = 10;
      const currentGroup = Math.ceil(this.currentPage / pageGroupSize);
      const newGroup = currentGroup + 1;
      this.currentPage = Math.min((newGroup - 1) * pageGroupSize + 1, this.totalPages);
    }
  }

  get paginatedEntries(): ActivityEntry[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEntries.slice(start, start + this.pageSize);
  }

  get paginatedAuditEntries(): AppointmentAuditListItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.auditEntries.slice(start, start + this.pageSize);
  }

  selectPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  clearDateFilter(): void {
    this.searchForm.controls.startDate.setValue('', { emitEvent: false });
    this.filterEntries();
    this.loadActivity();
  }

  statusLabel(oldStatus?: string | null, newStatus?: string | null): string {
    if (!oldStatus && !newStatus) return '—';
    if (!oldStatus) return String(newStatus);
    if (!newStatus) return String(oldStatus);
    return `${oldStatus} → ${newStatus}`;
  }
}
