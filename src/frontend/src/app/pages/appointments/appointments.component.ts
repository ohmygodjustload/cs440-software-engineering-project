/**
 * appointments.component.ts — client appointments page at "/appointments".
 *
 * Lists upcoming Booked appointments with edit-note and cancel actions.
 */

import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { SlotsService } from '../../core/services/slots.service';

import { isEnhancedUser } from '../../core/routing/home-route';
import { AuthService } from '../../core/services/auth.service';
import { ProviderHomeService } from '../../core/services/home-provider.service';
import { Appointment } from '../../core/models/appointment';
import { AppointmentsOverviewService } from '../../core/services/appointments-overview.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, LoadingComponent],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.css'
})
export class AppointmentsComponent implements OnInit {
  private readonly service = inject(AppointmentsOverviewService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly auth = inject(AuthService);
  private readonly providerHome = inject(ProviderHomeService);
  private readonly slots = inject(SlotsService);

  providerOpenSlots: Appointment[] = [];
  readonly openSlotsPageSize = 5;
  openSlotsVisible = this.openSlotsPageSize;

  get upcomingOpenSlots(): Appointment[] {
    const now = Date.now();
    return this.providerOpenSlots.filter(slot => Date.parse(slot.startDateTime) > now);
  }

  providerEditingId = '';
  providerStartDate = '';
  providerStartTime = '';
  pendingCancelAsProvider = false;

  readonly providerStartTimes = Array.from({ length: 17 }, (_, index) =>
    `${String(9 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 === 0 ? '00' : '30'}`
  );

  @ViewChild('cancelDialog') private cancelDialog?: ElementRef<HTMLDialogElement>;

  appointments: Appointment[] = [];
  providerAppointments: Appointment[] = [];
  providerLoading = false;
  providerError = '';


  get isEnhanced(): boolean {
    return isEnhancedUser(this.auth.getCurrentUser());
  }
  get isProvider(): boolean {
    const user = this.auth.getCurrentUser();
    return !!user && user.isServiceProvider && user.isActive !== false && !user.isAdmin;
  }
  get isClient(): boolean {
    const user = this.auth.getCurrentUser();
    return !!user && user.isClient && !user.isAdmin;
  }
  loading = false;
  saving = false;
  error = '';
  actionError = '';
  selectedId = '';
  editingNotesId = '';
  notesDraft = '';
  pendingCancel: Appointment | null = null;

  get bookedAppointments(): Appointment[] {
    return this.appointments
      .filter((item) => item.status === 'Booked')
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  get enhancedRoles(): readonly ('client' | 'provider')[] {
    if (this.isEnhanced) return ['client', 'provider'];
    if (this.isProvider) return ['provider'];
    return ['client'];
  }
  private readonly finishedPageSize = 5;
  private readonly finishedVisible = {
    client: this.finishedPageSize,
    provider: this.finishedPageSize
  };

  showMoreFinished(role: 'client' | 'provider'): void {
    this.finishedVisible[role] += this.finishedPageSize;
  }

  enhancedAppointmentGroups(role: 'client' | 'provider') {
      const appointments = role === 'client'
      ? this.appointments.filter(item => item.status === 'Booked' || item.status === 'Completed' || item.status === 'Canceled')
      : this.providerAppointments;
    const now = Date.now();
    const byStart = (a: Appointment, b: Appointment) =>
      Date.parse(a.startDateTime) - Date.parse(b.startDateTime);
    const upcoming: Appointment[] = [];
    const completed: Appointment[] = [];
    const canceled: Appointment[] = [];

    for (const appointment of appointments) {
      if (appointment.status === 'Canceled') {
        canceled.push(appointment);
      } else if (appointment.status === 'Completed' || Date.parse(appointment.endDateTime) <= now) {
        completed.push(appointment);
      } else {
        upcoming.push(appointment);
      }
    }

    const groups = [
      {
        title: 'Upcoming appointments',
        items: upcoming.sort(byStart),
        empty: 'No upcoming appointments.',
        hasMore: false
      }
    ];

    if (completed.length > 0) {
      groups.push({
        title: 'Completed appointments',
        items: completed.sort((a, b) => byStart(b, a)).slice(0, this.finishedVisible[role]),
        empty: 'No completed appointments.',
        hasMore: completed.length > this.finishedVisible[role]
      });
    }

    if (canceled.length > 0) {
      groups.push({
        title: 'Canceled appointments',
        items: canceled.sort((a, b) => {
          const ca = Date.parse(a.canceledAt ?? '');
          const cb = Date.parse(b.canceledAt ?? '');
          return cb - ca;
        }).slice(0, this.finishedVisible[role]),
        empty: 'No canceled appointments.',
        hasMore: canceled.length > this.finishedVisible[role]
      });
    }

    groups.push(...(role === 'provider' ? [{
        title: 'Open slots',
        items: this.upcomingOpenSlots.sort(byStart).slice(0, this.openSlotsVisible),
        empty: 'No upcoming open slots.',
        hasMore: false
      }] : []));

    return groups;
  }

  get upcomingAppointments(): Appointment[] {
    const now = Date.now();
    return this.bookedAppointments.filter((item) => Date.parse(item.endDateTime) >= now);
  }

  get nextAppointment(): Appointment | null {
    return this.upcomingAppointments[0] ?? null;
  }

  ngOnInit(): void {
    if (!this.isProvider || this.isEnhanced) this.load();
    if (this.isProvider) this.loadProviderAppointments();
  }

  load(): void {
    if (this.loading) return;
    this.loading = true;
    this.error = '';
    this.actionError = '';
    this.selectedId = '';
    this.editingNotesId = '';
    this.pendingCancel = null;

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

  loadProviderAppointments(): void {
    if (!this.isProvider || this.providerLoading) return;
    this.providerLoading = true;
    this.providerError = '';
    this.providerHome.bookings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.providerAppointments = items
          .filter((item) => (item.status === 'Booked' || item.status === 'Completed') && !!item.userId).sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
          this.providerLoading = false;
          this.providerOpenSlots = items.filter(
            item => item.status === 'Available' && !item.userId
          );
        },
        error: () => {
          this.providerError = 'Provider appointments could not be loaded.';
          this.providerLoading = false;
        }
      });
  }

  canManageProviderAppointment(item: Appointment): boolean {
    return (item.status === 'Booked' || item.status === 'Available') &&
      Date.parse(item.startDateTime) > Date.now();
  }


  startProviderEdit(item: Appointment): void {
    this.providerEditingId = item.id;
    const start = new Date(item.startDateTime);
    const local = new Date(start.getTime() - start.getTimezoneOffset() * 60_000).toISOString();
    this.providerStartDate = local.slice(0, 10);
    const time = local.slice(11, 16);
    this.providerStartTime = this.providerStartTimes.includes(time) ? time : '';
    this.actionError = '';
  }

  saveProviderEdit(item: Appointment): void {
    if (this.saving || this.providerEditingId !== item.id || !this.canManageProviderAppointment(item)) return;

    const start = new Date(this.providerStartDate + 'T' + this.providerStartTime);
    if (!this.providerStartTimes.includes(this.providerStartTime) ||
        !Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
      this.actionError = 'Choose a future start time between 9:00 AM and 5:00 PM.';
      return;
    }

    this.saving = true;
    this.actionError = '';
    this.slots.update(item.id, { startTime: start.toISOString(), confirm: item.status === 'Booked' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.providerEditingId = '';
          this.loadProviderAppointments();
        },
        error: (err) => {
          this.saving = false;
          this.actionError = typeof err?.error === 'string'
            ? err.error
            : 'The new start time could not be saved. Please try again.';
        }
      });
  }

  toggleDetails(id: string): void {
    this.selectedId = this.selectedId === id ? '' : id;
  }

  canManageClientBooking(appointment: Appointment): boolean {
    return appointment.status === 'Booked' && Date.parse(appointment.startDateTime) > Date.now();
  }

  startEditNotes(appointment: Appointment, detailsId = appointment.id): void {
    this.editingNotesId = appointment.id;
    this.notesDraft = appointment.notes ?? '';
    this.actionError = '';
    this.selectedId = detailsId;
  }

  cancelEditNotes(): void {
    this.editingNotesId = '';
    this.notesDraft = '';
  }

  saveNotes(appointment: Appointment): void {
    if (this.saving) return;
    this.saving = true;
    this.actionError = '';
    this.service.updateNotes(appointment.id, this.notesDraft)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.editingNotesId = '';
          this.load();
        },
        error: (err) => {
          this.saving = false;
          this.actionError = err?.status === 409
            ? 'Only Booked future appointments can be changed.'
            : 'Notes could not be saved. Please try again.';
        }
      });
  }

  openCancelDialog(appointment: Appointment, asProvider = false): void {
    this.pendingCancel = appointment;
    this.pendingCancelAsProvider = asProvider;
    this.actionError = '';
    this.cancelDialog?.nativeElement.showModal();
  }

  closeCancelDialog(): void {
    this.cancelDialog?.nativeElement.close();
    this.pendingCancel = null;
  }

  confirmCancel(): void {
    const appointment = this.pendingCancel;
    if (!appointment || this.saving) return;

    this.saving = true;
    this.actionError = '';
    const asProvider = this.pendingCancelAsProvider;
    const cancel: Observable<Appointment | void> = asProvider
      ? this.slots.delete(appointment, true)
      : this.service.cancelBooking(appointment.id, appointment.title, appointment.startDateTime);

    cancel.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving = false;
        this.closeCancelDialog();
        if (asProvider) {
          this.providerEditingId = '';
          this.loadProviderAppointments();
        }
        this.load();
      },
      error: (err) => {
        this.saving = false;
        if (asProvider) this.closeCancelDialog();
        this.actionError = asProvider
          ? 'The booking or slot could not be cancelled. Refresh the page and try again.'
          : err?.status === 409
            ? 'Only Booked future appointments can be canceled.'
            : 'Appointment could not be canceled. Please try again.';
      }
    });
  }
}
