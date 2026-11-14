import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { BookedSlotConflict } from '../../core/models/slot';
import { ProviderHomeService } from '../../core/services/home-provider.service';
import { SlotsService } from '../../core/services/slots.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-provider-home',
  standalone: true,
  imports: [DatePipe, FormsModule, NgTemplateOutlet, RouterLink, LoadingComponent],
  templateUrl: './home-provider.component.html',
  styleUrl: './home-provider.component.css'
})
export class ProviderHomeComponent implements OnInit {
  private readonly service = inject(ProviderHomeService);
  private readonly slots = inject(SlotsService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  @ViewChild('confirmDialog') private confirmDialog?: ElementRef<HTMLDialogElement>;

  appointments: Appointment[] = [];
  selectedKey = '';
  showAvailability = false;
  loading = false;
  saving = false;
  error = '';
  actionError = '';
  now = new Date();

  editingId = '';
  editStartLocal = '';
  pendingAction: { kind: 'update' | 'delete'; appointment: Appointment; startTime?: string } | null = null;
  pendingConflict: BookedSlotConflict | null = null;

  get openSlots(): Appointment[] {
    const now = Date.now();
    return this.appointments
      .filter(item => item.status === 'Available' && !item.userId &&
        Date.parse(item.startDateTime) > now)
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  private isBooked(item: Appointment): boolean {
    return ['Scheduled', 'Booked'].includes(item.status);
  }

  get upcomingBooked(): Appointment[] {
    const now = Date.now();
    return this.appointments
      .filter(item => this.isBooked(item) && Date.parse(item.endDateTime) > now)
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
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
    return this.upcomingBooked[0] ?? null;
  }

  get recentAppointments(): Appointment[] {
    return this.appointments.filter(item => ['Scheduled', 'Booked', 'Completed', 'Canceled', 'Cancelled', 'Missed'].includes(item.status) &&
      Date.parse(item.startDateTime) < this.now.getTime())
      .sort((a, b) => Date.parse(b.startDateTime) - Date.parse(a.startDateTime)).slice(0, 3);
  }

  ngOnInit(): void {
    this.load();
  }

  toggleDetails(key: string): void {
    this.selectedKey = this.selectedKey === key ? '' : key;
  }

  detailsOpen(key: string): boolean {
    return this.selectedKey === key;
  }

  load(): void {
    this.request?.unsubscribe();
    this.appointments = [];
    this.selectedKey = '';
    this.error = '';
    this.actionError = '';
    this.editingId = '';
    this.now = new Date();
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

  startEdit(appointment: Appointment): void {
    this.editingId = appointment.id;
    this.editStartLocal = this.toLocalInput(appointment.startDateTime);
    this.actionError = '';
  }

  cancelEdit(): void {
    this.editingId = '';
    this.editStartLocal = '';
  }

  saveEdit(appointment: Appointment, confirm = false): void {
    if (this.saving || !this.editStartLocal) return;
    const startTime = new Date(this.editStartLocal).toISOString();
    this.saving = true;
    this.actionError = '';
    this.slots.update(appointment.id, { startTime, confirm })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.editingId = '';
          this.closeConfirmDialog();
          this.load();
        },
        error: (err: HttpErrorResponse) => this.handleSlotError(err, {
          kind: 'update',
          appointment,
          startTime
        })
      });
  }

  deleteSlot(appointment: Appointment, confirm = false): void {
    if (this.saving) return;
    this.saving = true;
    this.actionError = '';
    this.slots.delete(appointment.id, confirm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.closeConfirmDialog();
          this.load();
        },
        error: (err: HttpErrorResponse) => this.handleSlotError(err, {
          kind: 'delete',
          appointment
        })
      });
  }

  confirmPending(): void {
    const pending = this.pendingAction;
    if (!pending) return;
    if (pending.kind === 'update') {
      this.editStartLocal = this.toLocalInput(pending.startTime ?? pending.appointment.startDateTime);
      this.saveEdit(pending.appointment, true);
      return;
    }
    this.deleteSlot(pending.appointment, true);
  }

  closeConfirmDialog(): void {
    this.confirmDialog?.nativeElement.close();
    this.pendingAction = null;
    this.pendingConflict = null;
  }

  private handleSlotError(
    err: HttpErrorResponse,
    pending: { kind: 'update' | 'delete'; appointment: Appointment; startTime?: string }
  ): void {
    this.saving = false;
    const body = err.error as BookedSlotConflict | string | null;
    if (err.status === 409 && body && typeof body === 'object' && body.requiresConfirm) {
      this.pendingAction = pending;
      this.pendingConflict = body;
      this.confirmDialog?.nativeElement.showModal();
      return;
    }
    this.actionError = typeof body === 'string' && body.trim()
      ? body
      : err.status === 409
        ? 'That change conflicts with another appointment.'
        : 'The slot could not be updated. Please try again.';
  }

  private toLocalInput(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
