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
  readonly client: RoleSummary = { role: 'client', heading: 'As a client', items: [], loading: false, error: '' };
  readonly provider: RoleSummary = { role: 'provider', heading: 'As a service provider', items: [], loading: false, error: '' };
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
}
