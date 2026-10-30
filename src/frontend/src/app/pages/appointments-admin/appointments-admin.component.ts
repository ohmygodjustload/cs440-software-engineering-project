import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { Appointment } from '../../core/models/appointment';
import { AppointmentCategory } from '../../core/models/appointment';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-appointments-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './appointments-admin.component.html',
  styleUrls: ['./appointments-admin.component.css']
})
export class AppointmentsAdminComponent implements OnInit {
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
    appointmentType: new FormControl('all'), // Fixed: Added missing comma
    startTime: new FormControl('')
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
        // Ensure initial page load displays the list
        this.filterAppointments(); 
    } catch (error) {
      this.error = 'Failed to load appointments.';
    } finally {
      this.loading = false;
    }})
  }

    filterAppointments(): void {
    const { search, appointmentType, startTime } = this.searchForm.value;
    const searchString = (search || '').toLowerCase().trim();

    this.filteredAppointments = this.appointments.filter(app => {
      const matchesSearch = 
        app.title.toLowerCase().includes(searchString);

      const matchesType = 
        !appointmentType || 
        appointmentType === 'all';

      const appointmentTime = app.startDateTime.substring(11, 16); 

      // Only apply the boundary if the user has typed a value (is not null, undefined, or empty string)
      const hasStartTime = startTime !== null && startTime !== undefined && startTime !== '';

      let matchesStart = true;

      if (hasStartTime) {
        matchesStart = appointmentTime >= startTime!;
      }

      return matchesSearch && matchesType && matchesStart;
    });
  }

}
