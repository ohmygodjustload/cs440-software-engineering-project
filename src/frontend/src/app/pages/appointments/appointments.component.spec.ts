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
  it('groups by local month and year, sorts starts, and excludes cancelled records', () => {
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [provideRouter([]), {
        provide: AppointmentsOverviewService,
        useValue: { loadAppointments: () => of([]) }
      }]
    });
    const component = TestBed.createComponent(AppointmentsComponent).componentInstance;
    const booking = (year: number, month: number, status: Appointment['status'] = 'Scheduled'): Appointment => ({
      id: `${year}-${month}-${status}`, title: 'Physical', category: 'Medical',
      startDateTime: new Date(year, month, 16, 14).toISOString(),
      endDateTime: new Date(year, month, 16, 15).toISOString(),
      providerId: 'p-1', userId: 'demo-user', status
    });
    component.appointments = [booking(2027, 9), booking(2026, 9), booking(2026, 8), booking(2026, 8, 'Cancelled')];

    expect(component.months.length).toBe(3);
    expect(component.months[0].items.length).toBe(1);
    expect(component.months[0].items[0].id).toBe('2026-8-Scheduled');
    expect(component.months[2].label).toContain('2027');
  });
});
