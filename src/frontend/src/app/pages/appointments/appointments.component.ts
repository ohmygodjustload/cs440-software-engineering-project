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

  @ViewChild('cancelDialog') private cancelDialog?: ElementRef<HTMLDialogElement>;

  appointments: Appointment[] = [];
  providerAppointments: Appointment[] = [];
  providerLoading = false;
  providerError = '';

  get isEnhanced(): boolean {
    return isEnhancedUser(this.auth.getCurrentUser());
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

  get upcomingAppointments(): Appointment[] {
    const now = Date.now();
    return this.bookedAppointments.filter((item) => Date.parse(item.endDateTime) >= now);
  }

  get nextAppointment(): Appointment | null {
    return this.upcomingAppointments[0] ?? null;
  }

  ngOnInit(): void {
    this.load();
    if (this.isEnhanced) this.loadProviderAppointments();
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
    if (!this.isEnhanced || this.providerLoading) return;
    this.providerLoading = true;
    this.providerError = '';
    this.providerHome.bookings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.providerAppointments = items
            .filter((item) => item.status === 'Booked' && !!item.userId)
            .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
          this.providerLoading = false;
        },
        error: () => {
          this.providerError = 'Provider appointments could not be loaded.';
          this.providerLoading = false;
        }
      });
  }

  toggleDetails(id: string): void {
    this.selectedId = this.selectedId === id ? '' : id;
  }

  startEditNotes(appointment: Appointment): void {
    this.editingNotesId = appointment.id;
    this.notesDraft = appointment.notes ?? '';
    this.actionError = '';
    this.selectedId = appointment.id;
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

  openCancelDialog(appointment: Appointment): void {
    this.pendingCancel = appointment;
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
    this.service.cancelBooking(appointment.id, appointment.title, appointment.startDateTime)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeCancelDialog();
          this.load();
        },
        error: (err) => {
          this.saving = false;
          this.actionError = err?.status === 409
            ? 'Only Booked future appointments can be canceled.'
            : 'Appointment could not be canceled. Please try again.';
        }
      });
  }
}
