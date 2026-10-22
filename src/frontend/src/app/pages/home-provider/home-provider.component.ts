import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { ProviderHomeService } from '../../core/services/home-provider.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-provider-home',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent],
  templateUrl: './home-provider.component.html',
  styleUrl: './home-provider.component.css'
})
export class ProviderHomeComponent implements OnInit {
  private readonly service = inject(ProviderHomeService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;
  showAvailability = false;
  loading = false;
  error = '';
  now = new Date();

  get openSlots(): Appointment[] {
    const now = Date.now();
    return this.appointments
      .filter(item => item.status === 'Available' && !item.userId &&
        Date.parse(item.startDateTime) > now)
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  private isBooked(item: Appointment): boolean {
    // Accept the legacy and renamed backend statuses during migration.
    return ['Scheduled', 'Booked'].includes(item.status);
  }

  get todayCount(): number {
    return this.appointments.filter(item => this.isBooked(item) &&
      new Date(item.startDateTime).toDateString() === this.now.toDateString()).length;
  }

  get weekCount(): number {
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return this.appointments.filter(item => {
      const time = new Date(item.startDateTime).getTime();
      return this.isBooked(item) && time >= start.getTime() && time < end.getTime();
    }).length;
  }

  get nextAppointment(): Appointment | null {
    return this.appointments.filter(item => this.isBooked(item) &&
      new Date(item.endDateTime).getTime() > this.now.getTime())
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime))[0] ?? null;
  }

  get recentAppointments(): Appointment[] {
    return this.appointments.filter(item => ['Scheduled', 'Booked', 'Completed', 'Canceled', 'Cancelled', 'Missed'].includes(item.status) &&
      Date.parse(item.startDateTime) < this.now.getTime())
      .sort((a, b) => Date.parse(b.startDateTime) - Date.parse(a.startDateTime)).slice(0, 3);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.request?.unsubscribe();
    this.appointments = [];
    this.selectedAppointment = null;
    this.error = '';
    this.now = new Date();
    this.loading = false;
    this.loading = true;
    this.request = this.service.bookings()
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: items => {
          this.appointments = items;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = 'Appointments could not be loaded. Please try again.';
        }
      });
  }
}
