/**
 * appointments.component.spec.ts — unit tests for AppointmentsComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Appointments Here!". Rewrite these expectations alongside the real scheduler.
 *
 */

/**
 * appointments.component.ts — AppointmentsComponent, the page served at "/appointments".
 *
 * Purpose: placeholder screen for the appointment scheduler (create, update, and delete an
 * appointment's category, date/time, provider, user, and location).
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { AppointmentsOverviewService } from '../../core/services/appointments-overview.service';
import { AppointmentsComponent } from './appointments.component';

describe('Appointments overview', () => {
  it('shows the soonest upcoming booked appointment', () => {
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [provideRouter([]), {
        provide: AppointmentsOverviewService,
        useValue: { loadAppointments: () => of([]) }
      }]
    });
    const component = TestBed.createComponent(AppointmentsComponent).componentInstance;
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const later = new Date();
    later.setDate(later.getDate() + 5);
    const past = new Date();
    past.setDate(past.getDate() - 2);
    const booking = (id: string, start: Date, status: Appointment['status'] = 'Booked'): Appointment => ({
      id, title: 'Physical', category: 'Medical',
      startDateTime: start.toISOString(),
      endDateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      providerId: 'p-1', userId: 'demo-user', status
    });
    component.appointments = [
      booking('later', later),
      booking('soonest', future),
      booking('past', past),
      booking('canceled', future, 'Canceled')
    ];

    expect(component.upcomingAppointments.map((item) => item.id)).toEqual(['soonest', 'later']);
    expect(component.nextAppointment?.id).toBe('soonest');
  });
});
