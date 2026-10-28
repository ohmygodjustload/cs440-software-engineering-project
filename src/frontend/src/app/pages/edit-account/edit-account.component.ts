import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface AdminReviewItem {
  id: string;
  name: string;
  categories: string;
}

export interface AdminActivityItem {
  id: string;
  at: Date;
  summary: string;
}

@Component({
  selector: 'app-edit-account',
  standalone: true,
  // imports: [RouterLink],
  templateUrl: './edit-account.component.html',
  styleUrl: './edit-account.component.css',
})
export class EditAccountComponent implements OnInit {
  now = new Date();
  loading = true;
  error: string | null = null;

  pendingApprovals = 0;
  activeProviders = 0;
  bookedToday = 0;
  reviews: AdminReviewItem[] = [];
  activity: AdminActivityItem[] = [];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.now = new Date();

    // Replace this stub with the admin overview API when it is available.
    try {
      this.pendingApprovals = 3;
      this.activeProviders = 12;
      this.bookedToday = 24;
      this.reviews = [
        { id: 'pr-104', name: 'Ava Brooks', categories: 'Beauty, Fitness' },
        { id: 'pr-105', name: 'Sally Smith', categories: 'Medical' },
      ];
      this.activity = [
        {
          id: 'act-1',
          at: new Date(2026, 8, 22, 10, 42),
          summary: 'Andrew Peirce marked appointment #A-208 Completed',
        },
        {
          id: 'act-2',
          at: new Date(2026, 8, 22, 10, 18),
          summary: 'Maya Chen created an Available slot',
        },
        {
          id: 'act-3',
          at: new Date(2026, 8, 22, 9, 56),
          summary: 'Ava Brooks submitted credentials for review',
        },
      ];
      this.loading = false;
    } catch {
      this.error = 'Could not load the admin overview.';
      this.loading = false;
    }
  }
}