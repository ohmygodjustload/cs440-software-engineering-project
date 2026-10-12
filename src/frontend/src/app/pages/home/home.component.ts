/**
 * home.component.ts — HomeComponent, the landing page served at "/".
 *
 * Purpose: placeholder screen for the home dashboard. It renders only "<h1>Home Here!</h1>" so the
 * shell and routing can be verified end to end; the real dashboard arrives in a later ticket.
 *
 */

import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { Appointment } from '../../core/models/appointment';
import { HomeService } from '../../core/services/home.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  private readonly service = inject(HomeService);
  private readonly destroyRef = inject(DestroyRef);

  now = new Date();
  loading = false;
  error = '';
  appointments: Appointment[] = [];
  selectedAppointment: Appointment | null = null;

  get greeting(): string {
    const hour = this.now.getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  get todayCount(): number {
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.countScheduled(start, end);
  }

  get weekCount(): number {
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    // The dashboard week runs Monday through Sunday in local time.
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return this.countScheduled(start, end);
  }

  get nextAppointment(): Appointment | null {
    return this.appointments
      .filter((item) => item.status === 'Scheduled' &&
        new Date(item.endDateTime).getTime() > this.now.getTime())
      .sort((a, b) => this.startTime(a) - this.startTime(b))[0] ?? null;
  }

  get recentAppointments(): Appointment[] {
    return this.appointments
      .filter((item) => this.startTime(item) <= this.now.getTime())
      .sort((a, b) => this.startTime(b) - this.startTime(a))
      .slice(0, 3);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading) return;

    this.now = new Date();
    this.loading = true;
    this.error = '';
    this.selectedAppointment = null;

    this.service.loadAppointments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.appointments = items;
          this.loading = false;
        },
        error: () => {
          this.error = 'Your appointments could not be loaded. Please try again.';
          this.loading = false;
        }
      });
  }

  private startTime(item: Appointment): number {
    return new Date(item.startDateTime).getTime();
  }

  private countScheduled(start: Date, end: Date): number {
    return this.appointments.filter((item) => {
      const time = this.startTime(item);

      return item.status === 'Scheduled' &&
        time >= start.getTime() && time < end.getTime();
    }).length;
  }
}
