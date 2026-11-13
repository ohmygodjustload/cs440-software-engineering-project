import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { AppointmentsOverviewService } from '../../core/services/appointments-overview.service';
import { AppointmentsComponent } from './appointments.component';

describe('Appointments overview', () => {
  const booking = (id: string, start: Date, status: Appointment['status'] = 'Booked'): Appointment => ({
    id,
    title: 'Physical',
    category: 'Medical',
    startDateTime: start.toISOString(),
    endDateTime: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    providerId: 'p-1',
    userId: 'demo-user',
    status,
    notes: 'initial'
  });

  function createComponent(service: Partial<AppointmentsOverviewService> = {}) {
    TestBed.configureTestingModule({
      imports: [AppointmentsComponent],
      providers: [
        provideRouter([]),
        {
          provide: AppointmentsOverviewService,
          useValue: {
            loadAppointments: () => of([]),
            updateNotes: () => of({} as Appointment),
            cancelBooking: () => of({} as Appointment),
            ...service
          }
        }
      ]
    });
    return TestBed.createComponent(AppointmentsComponent);
  }

  it('shows the soonest upcoming booked appointment', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const later = new Date();
    later.setDate(later.getDate() + 5);
    const past = new Date();
    past.setDate(past.getDate() - 2);
    component.appointments = [
      booking('later', later),
      booking('soonest', future),
      booking('past', past),
      booking('canceled', future, 'Canceled')
    ];

    expect(component.upcomingAppointments.map((item) => item.id)).toEqual(['soonest', 'later']);
    expect(component.nextAppointment?.id).toBe('soonest');
  });

  it('saves notes through the overview service', () => {
    const updated = booking('a1', new Date(Date.now() + 86400000));
    updated.notes = 'bring forms';
    const updateNotes = jasmine.createSpy('updateNotes').and.returnValue(of(updated));
    const loadAppointments = jasmine.createSpy('loadAppointments').and.returnValue(of([updated]));
    const fixture = createComponent({ updateNotes, loadAppointments });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.startEditNotes(updated);
    component.notesDraft = 'bring forms';
    component.saveNotes(updated);

    expect(updateNotes).toHaveBeenCalledWith('a1', 'bring forms');
  });

  it('cancels a booking after confirm', () => {
    const item = booking('a1', new Date(Date.now() + 86400000));
    const cancelBooking = jasmine.createSpy('cancelBooking').and.returnValue(of({ ...item, status: 'Available', userId: null }));
    const loadAppointments = jasmine.createSpy('loadAppointments').and.returnValue(of([]));
    const fixture = createComponent({ cancelBooking, loadAppointments });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.pendingCancel = item;
    component.confirmCancel();

    expect(cancelBooking).toHaveBeenCalledWith('a1', 'Physical');
  });

  it('surfaces a 409 when notes cannot be saved', () => {
    const item = booking('a1', new Date(Date.now() + 86400000));
    const updateNotes = jasmine.createSpy('updateNotes').and.returnValue(throwError(() => ({ status: 409 })));
    const fixture = createComponent({ updateNotes });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.saveNotes(item);

    expect(component.actionError).toContain('Only Booked future appointments');
  });
});
