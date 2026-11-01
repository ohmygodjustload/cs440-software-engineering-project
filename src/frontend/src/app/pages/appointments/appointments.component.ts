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
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [DatePipe, RouterLink, LoadingComponent],
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

  get bookedAppointments(): Appointment[] {
    return this.appointments
      .filter((item) => item.status === 'Booked')
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  get upcomingAppointments(): Appointment[] {
    const now = Date.now();
    return this.bookedAppointments.filter((item) => Date.parse(item.endDateTime) >= now);
  }

  get nextAppointment(): Appointment | null {
    return this.upcomingAppointments[0] ?? null;
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

}
