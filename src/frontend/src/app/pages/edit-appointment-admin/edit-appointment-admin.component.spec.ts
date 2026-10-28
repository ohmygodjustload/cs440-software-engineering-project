import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

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

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning, Admin';
  if (hour < 17) return 'Good afternoon, Admin';
  return 'Good evening, Admin';
}

@Component({
  selector: 'app-edit-appointment-admin',
  standalone: true,
  // imports: [RouterLink],
  templateUrl: './edit-appointment-admin.component.html',
  styleUrl: './edit-appointment-admin.component.css',
})
export class EditAppointmentAdminComponent implements OnInit {
  now = new Date();
  loading = true;
  error: string | null = null;

  pendingApprovals = 0;
  activeProviders = 0;
  bookedToday = 0;
  reviews: AdminReviewItem[] = [];
  activity: AdminActivityItem[] = [];

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