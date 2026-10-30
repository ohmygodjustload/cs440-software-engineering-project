import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingComponent } from '../../core/components/loading/loading.component';

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
  entries: ActivityEntry[] = [];
  filteredEntries: ActivityEntry[] = [];
  loading = false;
  clearing = false;
  error: string | null = null;
  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadActivity();
    this.searchForm.valueChanges.subscribe(() => this.filterEntries());
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
  }

  clearActivity(): void {
    if (this.clearing || this.entries.length === 0) return;
    const confirmed = window.confirm(
      'Delete all activity log entries? This action cannot be undone.'
    );
    if (!confirmed) return;

    this.clearing = true;
    this.error = null;
    this.http.delete('/api/admin/activity').subscribe({
      next: () => {
        this.entries = [];
        this.filteredEntries = [];
        this.clearing = false;
      },
      error: () => {
        this.error = 'Failed to clear activity.';
        this.clearing = false;
      }
    });
  }
}
