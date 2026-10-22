/**
 * statistics.component.ts — StatisticsComponent, the page served at "/statistics".
 *
 * Purpose: placeholder screen for the statistics panel (historical appointments by category, day of
 * the week, and time of day). It renders only "<h1>Statistics Here!</h1>" until that ticket is
 * picked up.
 *
 */

/** Client appointment history, grouped by category and local start time. */
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { Appointment } from '../../core/models/appointment';
import { StatisticsService } from '../../core/services/statistics.service';

interface ChartCount {
  label: string;
  count: number;
}

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css'
})
export class StatisticsComponent implements OnInit {
  private readonly service = inject(StatisticsService);
  private readonly destroyRef = inject(DestroyRef);

  appointments: Appointment[] = [];
  rangeDays = 90;
  loading = false;
  error = '';
  now = new Date();

  get rangeAppointments(): Appointment[] {
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (this.rangeDays - 1));

    return this.appointments.filter((item) => {
      const time = Date.parse(item.startDateTime);
      return time >= start.getTime() && time <= this.now.getTime();
    });
  }

  get completed(): Appointment[] {
    return this.rangeAppointments.filter((item) => item.status === 'Completed');
  }

  get cancelledCount(): number {
    return this.rangeAppointments.filter((item) => item.status === 'Canceled').length;
  }

  get categories(): ChartCount[] {
    return ['Medical', 'Beauty', 'Fitness'].map((category) => ({
      label: category,
      count: this.completed.filter((item) => item.category === category).length
    }));
  }

  get weekdays(): ChartCount[] {
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return labels.map((label, index) => ({
      label,
      count: this.completed.filter((item) =>
        (new Date(item.startDateTime).getDay() + 6) % 7 === index).length
    }));
  }

  get times(): ChartCount[] {
    return ['Morning', 'Afternoon', 'Evening'].map((label, index) => ({
      label,
      count: this.completed.filter((item) => {
        const hour = new Date(item.startDateTime).getHours();
        const bucket = hour < 12 ? 0 : hour < 18 ? 1 : 2;
        return bucket === index;
      }).length
    }));
  }

  percentage(count: number, rows: ChartCount[]): number {
    const maximum = Math.max(0, ...rows.map((row) => row.count));
    return maximum === 0 ? 0 : count / maximum * 100;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.now = new Date();

    this.service.loadAppointments()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.appointments = items;
          this.loading = false;
        },
        error: (error: unknown) => {
          this.error = error instanceof Error && !(error instanceof HttpErrorResponse)
            ? error.message
            : 'Statistics could not be loaded. Please check the API and try again.';
          this.loading = false;
        }
      });
  }
}

