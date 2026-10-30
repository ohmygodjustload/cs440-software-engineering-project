import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Appointment, AppointmentCategory } from '../../core/models/appointment';
import { User } from '../../core/models/user';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-appointments-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './appointments-admin.component.html',
  styleUrls: ['./appointments-admin.component.css']
})
export class AppointmentsAdminComponent implements OnInit {
  private readonly http = inject(HttpClient);
  appointments: Appointment[] = [];
  accounts: User[] = [];
  filteredAppointments: Appointment[] = [];
  loading = false;
  error: string | null = null;
  readonly expandedAppointments = new Set<string>();
  readonly categories: readonly AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];
  readonly searchForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    appointmentType: new FormControl('all', { nonNullable: true }),
    startDate: new FormControl('', { nonNullable: true })
  });

  ngOnInit(): void {
    this.loadAppointments();
    this.http.get<User[]>('/api/admin/accounts').subscribe({
      next: (accounts) => {
        this.accounts = accounts ?? [];
        this.filterAppointments();
      }
    });
    this.searchForm.valueChanges.subscribe(() => this.filterAppointments());
    this.searchForm.controls.startDate.valueChanges.subscribe(() => this.loadAppointments());
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = null;
    let params = new HttpParams();
    const date = this.searchForm.controls.startDate.value;
    if (date) params = params.set('date', `${date}T00:00:00Z`);
    this.http.get<Appointment[]>('/api/admin/appointments', { params }).subscribe({
      next: (appointments) => {
        this.appointments = appointments ?? [];
        this.filterAppointments();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load appointments.';
        this.loading = false;
      }
    });
  }

  filterAppointments(): void {
    const search = this.searchForm.controls.search.value.trim().toLowerCase();
    const category = this.searchForm.controls.appointmentType.value;
    this.filteredAppointments = this.appointments.filter((appointment) => {
      const text = `${appointment.title} ${appointment.providerName ?? ''} ${appointment.location ?? ''} ${this.clientName(appointment)}`.toLowerCase();
      const selectedDate = this.searchForm.controls.startDate.value;
      const appointmentDate = appointment.startDateTime.slice(0, 10);
      return (!search || text.includes(search)) &&
        (category === 'all' || appointment.category === category) &&
        (!selectedDate || appointmentDate === selectedDate);
    });
  }

  toggleAppointment(id: string): void {
    if (this.expandedAppointments.has(id)) {
      this.expandedAppointments.delete(id);
    } else {
      this.expandedAppointments.add(id);
    }
  }

  clearDateFilter(): void {
    this.searchForm.controls.startDate.setValue('', { emitEvent: false });
    this.filterAppointments();
    this.loadAppointments();
  }

  isExpanded(id: string): boolean {
    return this.expandedAppointments.has(id);
  }

  clientName(appointment: Appointment): string {
    if (!appointment.userId) return 'Available slot';
    const client = this.accounts.find((account) => account.id === appointment.userId);
    return client ? `${client.firstName} ${client.lastName}` : appointment.userId;
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Time unavailable'
      : new Intl.DateTimeFormat('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }).format(date);
  }
}
