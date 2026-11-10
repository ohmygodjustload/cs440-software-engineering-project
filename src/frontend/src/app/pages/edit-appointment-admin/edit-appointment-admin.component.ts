import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import {
  Appointment,
  AppointmentCategory,
  AppointmentStatus
} from '../../core/models/appointment';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-edit-appointment-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-appointment-admin.component.html',
  styleUrl: './edit-appointment-admin.component.css'
})
export class EditAppointmentAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  appointment: Appointment | null = null;
  loading = true;
  saving = false;
  error: string | null = null;

  private originalValues: string | null = null;

  readonly categories: readonly AppointmentCategory[] = [
    'Medical',
    'Beauty',
    'Fitness'
  ];

  readonly statuses: readonly AppointmentStatus[] = [
    'Available',
    'Booked',
    'Completed',
    'Canceled',
    'Missed'
  ];

  readonly startTimes = this.buildStartTimes(9, 17.5, 30);

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id');

    if (!id) {
      this.error = 'No appointment was selected.';
      this.loading = false;
      return;
    }

    this.http
      .get<Appointment>(`/api/appointments/${encodeURIComponent(id)}`)
      .subscribe({
        next: (appointment) => {
          this.appointment = {
            ...appointment,
            startDateTime: this.toDateTimeLocal(appointment.startDateTime),
            endDateTime: this.toDateTimeLocal(appointment.endDateTime)
          };

          this.originalValues = this.editableValues(this.appointment);
          this.loading = false;
        },
        error: () => {
          this.error = 'Failed to load appointment.';
          this.loading = false;
        }
      });
  }

  save(): void {
    if (!this.appointment || this.saving || !this.hasChanges) {
      return;
    }

    // The editable fields contain browser-local date/time strings.
    const startDateTime = new Date(this.appointment.startDateTime);
    const endDateTime = new Date(this.appointment.endDateTime);

    if (
      Number.isNaN(startDateTime.getTime()) ||
      Number.isNaN(endDateTime.getTime()) ||
      endDateTime <= startDateTime
    ) {
      this.error = 'End time must be after start time.';
      return;
    }

    // The backend uses this zone to format both the original and
    // updated timestamps in activity and notification messages.
    const timeZoneId =
      new Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (!timeZoneId) {
      this.error =
        'Could not determine your time zone. Please check your browser settings.';
      return;
    }

    this.saving = true;
    this.error = null;

    this.http
      .put<Appointment>(
        `/api/admin/appointments/${encodeURIComponent(this.appointment.id)}`,
        {
          title: this.appointment.title,
          category: this.appointment.category,

          // Preserve UTC timestamps for API storage.
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),

          // Use the editor's time zone for activity-message display.
          timeZoneId,

          providerId: this.appointment.providerId,
          providerName: this.appointment.providerName,
          location: this.appointment.location,
          notes: this.appointment.notes,
          status: this.appointment.status
        }
      )
      .subscribe({
        next: (appointment) => {
          // Convert the API timestamps back into editable local values.
          this.appointment = {
            ...appointment,
            startDateTime: this.toDateTimeLocal(appointment.startDateTime),
            endDateTime: this.toDateTimeLocal(appointment.endDateTime)
          };

          this.originalValues = this.editableValues(this.appointment);
          this.saving = false;

          this.toastService.show({
            title: 'Appointment updated',
            message: 'Appointment saved.',
            variant: 'success',
            actionUrl: '/appointments-admin'
          });
        },
        error: () => {
          this.error = 'Could not save this appointment.';
          this.saving = false;
        }
      });
  }

  get selectedDate(): string {
    return this.appointment?.startDateTime.split('T')[0] ?? '';
  }

  get hasChanges(): boolean {
    return (
      this.appointment !== null &&
      this.originalValues !== this.editableValues(this.appointment)
    );
  }

  get selectedTime(): string {
    return this.appointment?.startDateTime.split('T')[1]?.slice(0, 5) ?? '';
  }

  get dateLabel(): string {
    if (!this.selectedDate) {
      return '';
    }

    const date = new Date(`${this.selectedDate}T12:00`);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  get dateOptions(): { key: string; date: Date }[] {
    if (!this.selectedDate) {
      return [];
    }

    const selected = new Date(`${this.selectedDate}T12:00`);

    if (Number.isNaN(selected.getTime())) {
      return [];
    }

    const monday = new Date(selected);
    monday.setDate(
      selected.getDate() - ((selected.getDay() + 6) % 7)
    );

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);

      return {
        key: this.localInput(date.toISOString()).split('T')[0],
        date
      };
    });
  }

  chooseDate(date: string): void {
    if (
      !this.appointment ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return;
    }

    this.setStart(date, this.selectedTime || '10:30');
  }

  chooseTime(time: string): void {
    if (
      !this.appointment ||
      !this.selectedDate ||
      !this.startTimes.includes(time)
    ) {
      return;
    }

    this.setStart(this.selectedDate, time);
  }

  timeLabel(time: string): string {
    const [hour, minute] = time.split(':').map(Number);

    return (
      `${hour % 12 || 12}:` +
      `${String(minute).padStart(2, '0')} ` +
      `${hour >= 12 ? 'PM' : 'AM'}`
    );
  }

  private setStart(date: string, time: string): void {
    if (!this.appointment) {
      return;
    }

    const start = new Date(`${date}T${time}`);

    if (Number.isNaN(start.getTime())) {
      this.error = 'Please select a valid appointment date and time.';
      return;
    }

    // Preserve the existing behavior: each selected slot lasts one hour.
    const end = new Date(start.getTime() + 60 * 60000);

    this.appointment.startDateTime =
      this.localInput(start.toISOString());

    this.appointment.endDateTime =
      this.localInput(end.toISOString());

    this.error = null;
  }

  private buildStartTimes(
    startHour: number,
    endHour: number,
    stepMinutes: number
  ): string[] {
    const out: string[] = [];

    for (
      let minutes = startHour * 60;
      minutes <= endHour * 60;
      minutes += stepMinutes
    ) {
      const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
      const minute = String(minutes % 60).padStart(2, '0');

      out.push(`${hour}:${minute}`);
    }

    return out;
  }

  cancel(): void {
    void this.router.navigate(['/appointments-admin']);
  }

  private toDateTimeLocal(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const pad = (part: number): string =>
      String(part).padStart(2, '0');

    return (
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}T` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}`
    );
  }

  private localInput(value: string): string {
    return this.toDateTimeLocal(value);
  }

  private editableValues(appointment: Appointment): string {
    return JSON.stringify({
      title: appointment.title,
      category: appointment.category,
      startDateTime: appointment.startDateTime,
      endDateTime: appointment.endDateTime,
      providerId: appointment.providerId,
      providerName: appointment.providerName,
      location: appointment.location,
      notes: appointment.notes,
      status: appointment.status
    });
  }
}
