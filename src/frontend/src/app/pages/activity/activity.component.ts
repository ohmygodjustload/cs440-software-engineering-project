import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Appointment } from '../../core/models/appointment';
import { AppointmentCategory } from '../../core/models/appointment';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './activity.component.html',
  styleUrls: ['./activity.component.css']
})
export class ActivityComponent implements OnInit {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  loading = false;
  error: string | null = null;

  get categories(): readonly AppointmentCategory[] {
    const allowed: AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];
    return allowed;
  }

  searchForm = new FormGroup({
    search: new FormControl(''),
    appointmentType: new FormControl('all')
  });

  ngOnInit(): void {
    this.loadAppointments();

    this.searchForm.valueChanges.subscribe(() => {
      this.filterAppointments();
    });
  }

  loadAppointments(): void {
    this.loading = true;
    this.error = null;

    // Simulating API behavior
    setTimeout(() => {
      try {
        this.appointments = [
          {
            status: 'Available',
            title: 'Dental Checkup',
            category: 'Medical',
            startDateTime: '2024-06-01T10:00:00Z',
            endDateTime: '2024-06-01T11:00:00Z',
            providerId: 'provider1',
            providerName: 'Dr. Smith',
            userId: null,
            location: 'Dental Clinic',
            notes: 'Bring previous dental records.',
            id: '1'     
          },
          {
            status: 'Booked',
            title: 'Haircut',
            category: 'Beauty',
            startDateTime: '2024-06-01T12:00:00Z',
            endDateTime: '2024-06-01T13:00:00Z',
            providerId: 'provider2',
            providerName: 'Stylist Jane',
            userId: 'user1',
            location: 'Beauty Salon',
            notes: 'Customer prefers a trim.',
            id: '2'
          }
        ];
    } catch (error) {
      this.error = 'Failed to load appointments.';
    } finally {
      this.loading = false;
    }})
  }

  filterAppointments(): void {
    const { search, appointmentType } = this.searchForm.value;
    const searchString = (search || '').toLowerCase().trim();

    this.filteredAppointments = this.appointments.filter(app => {
      const matchesSearch = 
        app.title.toLowerCase().includes(searchString) // ||
        // app.username.toLowerCase().includes(searchString) ||
        // app.email.toLowerCase().includes(searchString);

      const matchesType = 
        !appointmentType || 
        appointmentType === 'all' //|| 
        // app.appointmentTypeId.toLowerCase() === appointmentType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }
}
