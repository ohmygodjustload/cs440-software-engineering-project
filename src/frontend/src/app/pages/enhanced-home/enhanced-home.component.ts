import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Appointment } from '../../core/models/appointment';
import { AuthService } from '../../core/services/auth.service';
import { EnhancedHomeService } from '../../core/services/enhanced-home.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

interface RoleSummary {
  role: 'client' | 'provider';
  heading: string;
  items: Appointment[];
  loading: boolean;
  error: string;
  greyedOut: boolean;
}

@Component({
  selector: 'app-enhanced-home',
  standalone: true,
  imports: [DatePipe, RouterLink, LoadingComponent, NgTemplateOutlet],
  templateUrl: './enhanced-home.component.html',
  styleUrl: './enhanced-home.component.css'
})
export class EnhancedHomeComponent implements OnInit {
  private readonly service = inject(EnhancedHomeService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  now = new Date();
  selectedAppointment: Appointment | null = null;
  selectedRole: RoleSummary['role'] = 'client';
  showAvailability = false;
  readonly client: RoleSummary = {
    role: 'client',
    heading: 'As a client',
    items: [],
    loading: false,
    error: '',
    greyedOut: false,
  };
  readonly provider: RoleSummary = {
    role: 'provider',
    heading: 'As a service provider',
    items: [],
    loading: false,
    error: '',
    greyedOut: false,
  };
  readonly summaries = [this.client, this.provider];

  get greeting(): string {
    const hour = this.now.getHours();
    return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  }

  get displayName(): string {
    const user = this.auth.getCurrentUser();
    return user?.firstName?.trim() || user?.username || '';
  }

  get openSlots(): Appointment[] {
    return this.provider.items.filter(item => item.status === 'Available' && !item.userId &&
      Date.parse(item.startDateTime) > this.now.getTime())
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  /** Returns true if two appointments overlap in time. */
  private overlaps(a: Appointment, b: Appointment): boolean {
    const aStart = Date.parse(a.startDateTime);
    const aEnd = Date.parse(a.endDateTime);
    const bStart = Date.parse(b.startDateTime);
    const bEnd = Date.parse(b.endDateTime);
    return aStart < bEnd && bStart < aEnd;
  }

  /** Returns true if the appointment conflicts with any appointment in the other role's list. */
  hasConflict(item: Appointment, summary: RoleSummary): boolean {
    const other = summary.role === 'client' ? this.provider : this.client;
    return other.items.some(otherItem => this.overlaps(item, otherItem));
  }

  ngOnInit(): void { this.refresh(); }

  load(summary: RoleSummary): void {
    if (summary.loading) return;
    summary.loading = true;
    summary.error = '';
    summary.items = [];
    if (this.selectedRole === summary.role) this.selectedAppointment = null;
    this.now = new Date();
    const request = summary.role === 'client'
      ? this.service.clientAppointments()
      : this.service.providerAppointments();
    request.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => summary.loading = false))
      .subscribe({
        next: items => summary.items = items,
        error: () => summary.error = 'Your appointments could not be loaded. Please try again.'
      });
  }

  refresh(): void {
    this.load(this.client);
    this.load(this.provider);
  }

  todayCount(summary: RoleSummary): number {
    return summary.items.filter(item => item.status === 'Booked' &&
      new Date(item.startDateTime).toDateString() === this.now.toDateString()).length;
  }

  weekCount(summary: RoleSummary): number {
    const start = new Date(this.now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return summary.items.filter(item => item.status === 'Booked' &&
      Date.parse(item.startDateTime) >= +start && Date.parse(item.startDateTime) < +end).length;
  }

  next(summary: RoleSummary): Appointment | null {
    return summary.items.filter(item => item.status === 'Booked' && Date.parse(item.endDateTime) > +this.now)
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime))[0] ?? null;
  }

  recent(summary: RoleSummary): Appointment[] {
    return summary.items.filter(item => ['Booked', 'Completed', 'Canceled', 'Missed'].includes(item.status) &&
      Date.parse(item.endDateTime) <= +this.now)
      .sort((a, b) => Date.parse(b.startDateTime) - Date.parse(a.startDateTime)).slice(0, 3);
  }

  detailsAreOpen(item: Appointment, summary: RoleSummary): boolean {
    return this.selectedRole === summary.role && this.selectedAppointment?.id === item.id;
  }

  showDetails(item: Appointment, summary: RoleSummary): void {
    this.selectedAppointment = this.detailsAreOpen(item, summary) ? null : item;
    this.selectedRole = summary.role;
  }

  displayStatus(item: Appointment): string {
    return item.status === 'Booked' &&
      Date.parse(item.endDateTime) <= this.now.getTime()
        ? 'Completed'
        : item.status;
  }
}
