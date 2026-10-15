import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { BookedAppointment, Slot } from '../../core/models/slot';
import { SlotsService } from '../../core/services/slots.service';
import { BookAppointmentComponent } from './book-appointment.component';

describe('BookAppointmentComponent', () => {
  const slot: Slot = {
    id: 's1',
    title: 'General checkup',
    category: 'Medical',
    startDateTime: '2027-01-01T10:00:00Z',
    endDateTime: '2027-01-01T10:30:00Z',
    providerId: '6abc1939a313dfdf8ecc0265',
    providerName: 'John Smith',
    userId: null,
    appointmentTypeId: 't1',
    location: '1 Main St, Chicago, IL, 60601',
    notes: '',
    status: 'Available'
  };
  const booking: BookedAppointment = {
    ...slot, status: 'Booked', userId: '6abc20bda313dfdf8ecc0286', notes: 'First visit'
  };

  let slots: jasmine.SpyObj<SlotsService>;

  function create() {
    TestBed.configureTestingModule({
      imports: [BookAppointmentComponent],
      providers: [provideRouter([]), { provide: SlotsService, useValue: slots }]
    });
    const fixture = TestBed.createComponent(BookAppointmentComponent);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    slots = jasmine.createSpyObj<SlotsService>('SlotsService', ['getAvailable', 'book']);
    slots.getAvailable.and.returnValue(of([slot]));
  });

  it('lists the open slots on load', () => {
    const fixture = create();

    expect(slots.getAvailable).toHaveBeenCalledWith({});
    expect(fixture.componentInstance.slots).toEqual([slot]);
    expect(fixture.nativeElement.textContent).toContain('General checkup');
    expect(fixture.nativeElement.textContent).toContain('John Smith');
  });

  it('reloads the slots with the chosen category', () => {
    const component = create().componentInstance;

    component.category = 'Beauty';
    component.loadSlots();

    expect(slots.getAvailable).toHaveBeenCalledWith({ category: 'Beauty' });
  });

  it('books the selected slot with the notes and shows the confirmation', () => {
    slots.book.and.returnValue(of(booking));
    const fixture = create();
    const component = fixture.componentInstance;

    component.choose('s1');
    component.notes = 'First visit';
    component.book();
    fixture.detectChanges();

    expect(slots.book).toHaveBeenCalledWith('s1', 'First visit');
    expect(component.booked).toEqual(booking);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Appointment booked');
    expect(text).toContain('John Smith');
    expect(text).toContain('General checkup');
    expect(text).toContain('1 Main St, Chicago, IL, 60601');
  });

  it('does nothing when no slot is selected', () => {
    create().componentInstance.book();

    expect(slots.book).not.toHaveBeenCalled();
  });

  it('explains a 409 and refreshes the list', () => {
    slots.book.and.returnValue(throwError(() =>
      new HttpErrorResponse({ status: 409, error: 'Slot is no longer available.' })));
    const component = create().componentInstance;

    component.choose('s1');
    component.book();

    expect(component.formError).toBe('Slot is no longer available.');
    expect(component.booked).toBeNull();
    expect(slots.getAvailable).toHaveBeenCalledTimes(2);
  });

  it('asks the user to sign in on a 401', () => {
    slots.book.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));
    const component = create().componentInstance;

    component.choose('s1');
    component.book();

    expect(component.formError).toBe('Please sign in to book an appointment.');
  });
});
