/**
 * appointments.component.ts — AppointmentsComponent, the page served at "/appointments".
 *
 * Purpose: placeholder screen for the appointment scheduler (create, update, and delete an
 * appointment's category, date/time, provider, user, and location). It renders only
 * "<h1>Appointments Here!</h1>" until that ticket is picked up.
 *
 */

import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Appointment } from '../../core/models/appointment';
import { AppointmentsOverviewService } from '../../core/services/appointments-overview.service';

interface AppointmentMonth {
  key: string;
  label: string;
  items: Appointment[];
}

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.css'
})
export class AppointmentsComponent implements OnInit {
  private readonly service = inject(AppointmentsOverviewService);
  private readonly destroyRef = inject(DestroyRef);

  appointments: Appointment[] = [];
  loading = false;
  error = '';
  selectedId = '';
  cancellingId: string | null = null;
  actionError = '';

  get months(): AppointmentMonth[] {
    const groups = new Map<string, AppointmentMonth>();
    const sorted = this.appointments
      .filter((item) => item.status === 'Booked')
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));

    for (const item of sorted) {
      const date = new Date(item.startDateTime);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      let group = groups.get(key);

      if (!group) {
        group = {
          key,
          label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          items: []
        };
        groups.set(key, group);
      }
      group.items.push(item);
    }
    return Array.from(groups.values());
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.selectedId = '';

    this.service.loadAppointments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.appointments = items;
          this.loading = false;
        },
        error: () => {
          this.error = 'Appointments could not be loaded. Check the API and try again.';
          this.loading = false;
        }
      });
  }

  toggleDetails(id: string): void {
    this.selectedId = this.selectedId === id ? '' : id;
  }

  /** Cancels one appointment; the service pops the "Appointment cancelled" popup. */
  cancel(id: string): void {
    if (this.cancellingId) {
      return;
    }
    const target = this.appointments.find((item) => item.id === id);
    this.cancellingId = id;
    this.actionError = '';

    this.service.cancelAppointment(id, target?.title ?? 'Appointment')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cancellingId = null;
          if (this.selectedId === id) {
            this.selectedId = '';
          }
          this.load();
        },
        error: () => {
          this.cancellingId = null;
          this.actionError = 'That appointment could not be cancelled. Please try again.';
        }
      });
  }
}
