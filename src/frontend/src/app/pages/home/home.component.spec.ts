/**
 * home.component.spec.ts — unit tests for HomeComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Home Here!". Rewrite these expectations alongside the real dashboard.
 *
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { HomeService } from '../../core/services/home.service';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let service: jasmine.SpyObj<HomeService>;
  let component: HomeComponent;

  const appointment = (start: Date, status: Appointment['status'] = 'Scheduled'): Appointment => ({
    id: start.toISOString(),
    title: 'Physical',
    category: 'Medical',
    providerId: 'p-1',
    userId: 'demo-user',
    startDateTime: start.toISOString(),
    endDateTime: new Date(start.getTime() + 3600000).toISOString(),
    status
  });

  beforeEach(() => {
    service = jasmine.createSpyObj<HomeService>('HomeService', ['loadAppointments']);
    service.loadAppointments.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        provideRouter([]),
        { provide: HomeService, useValue: service }
      ]
    });

    component = TestBed.createComponent(HomeComponent).componentInstance;
    component.now = new Date(2026, 9, 14, 12);
  });

  it('counts scheduled starts using local day and Monday week boundaries', () => {
    component.appointments = [
      appointment(new Date(2026, 9, 14, 14)),
      appointment(new Date(2026, 9, 14, 15), 'Cancelled'),
      appointment(new Date(2026, 9, 12, 0)),
      appointment(new Date(2026, 9, 18, 23)),
      appointment(new Date(2026, 9, 19, 0))
    ];

    expect(component.todayCount).toBe(1);
    expect(component.weekCount).toBe(3);
  });

  it('shows an ongoing appointment before a later appointment', () => {
    const ongoing = appointment(new Date(2026, 9, 14, 11, 30));
    component.appointments = [
      appointment(new Date(2026, 9, 15, 14)),
      appointment(new Date(2026, 9, 14, 10)),
      ongoing
    ];

    expect(component.nextAppointment).toBe(ongoing);
  });

  it('shows an error when loading fails and allows retry', () => {
    service.loadAppointments.and.returnValue(throwError(() => new Error('Offline')));
    component.load();

    expect(component.error).toContain('could not be loaded');
    expect(component.loading).toBeFalse();

    service.loadAppointments.and.returnValue(of([]));
    component.load();

    expect(component.error).toBe('');
    expect(component.nextAppointment).toBeNull();
  });
});
