/**
 * calendar.component.spec.ts — unit tests for CalendarComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Calendar Here!". Rewrite these expectations alongside the real calendar.
 *
 */

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CalendarComponent } from './calendar.component';
import { CalendarService } from '../../core/services/calendar.service';
import { AuthService } from '../../core/services/auth.service';
import { CalendarViewService, DEFAULT_CALENDAR_VIEW } from '../../core/services/calendar-view.service';

describe('CalendarComponent', () => {
  const service = {
    getItems: jasmine.createSpy('getItems').and.returnValue(of([]))
  };
  const calendarViewService = {
    getView: jasmine.createSpy('getView').and.returnValue(DEFAULT_CALENDAR_VIEW)
  };
  const authService = {
    getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(null)
  };

  beforeEach(async () => {
    service.getItems.calls.reset();
    service.getItems.and.returnValue(of([]));
    calendarViewService.getView.calls.reset();
    calendarViewService.getView.and.returnValue(DEFAULT_CALENDAR_VIEW);
    authService.getCurrentUser.calls.reset();
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        { provide: CalendarService, useValue: service },
        { provide: CalendarViewService, useValue: calendarViewService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
  });

  it('renders September 2026 as five Sunday-first weeks', () => {
    const fixture = TestBed.createComponent(CalendarComponent);

    fixture.componentInstance.month = new Date(2026, 8, 1);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    expect(component.days.length).toBe(35);
    expect(component.days[0].date.toDateString())
      .toBe(new Date(2026, 7, 30).toDateString());

    expect(component.days[34].date.toDateString())
      .toBe(new Date(2026, 9, 3).toDateString());

    expect(
      fixture.nativeElement.querySelectorAll('[role="cell"]').length
    ).toBe(35);
  });

  it('navigates across the year boundary and returns to today', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    component.month = new Date(2026, 11, 1);

    component.nextMonth();

    expect(component.month.getFullYear()).toBe(2027);
    expect(component.month.getMonth()).toBe(0);

    component.previousMonth();

    expect(component.month.getMonth()).toBe(11);

    component.goToToday();

    expect(component.month.getMonth()).toBe(new Date().getMonth());
    expect(component.month.getFullYear()).toBe(new Date().getFullYear());
  });

  it('places an overnight appointment on both overlapping local days', () => {
    service.getItems.and.returnValue(
      of([
        {
          id: 'overnight',
          title: 'Overnight appointment',
          category: 'Medical',
          status: 'Booked',
          startDateTime: new Date(2026, 8, 16, 23).toISOString(),
          endDateTime: new Date(2026, 8, 17, 1).toISOString()
        }
      ])
    );

    const fixture = TestBed.createComponent(CalendarComponent);

    fixture.componentInstance.month = new Date(2026, 8, 1);
    fixture.detectChanges();

    expect(
      fixture.componentInstance.days
        .filter(day => day.items.length)
        .map(day => day.date.getDate())
    ).toEqual([16, 17]);
  });

  it('applies the saved default view for the signed-in user on load', () => {
    authService.getCurrentUser.and.returnValue({ id: 'user-9' } as never);
    calendarViewService.getView.and.returnValue('week');

    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    expect(calendarViewService.getView).toHaveBeenCalledWith('user-9');
    expect(fixture.componentInstance.view).toBe('week');
    expect(fixture.componentInstance.days.length).toBe(7);
    // The saved week default lands on the current week, not the month's first week.
    const today = new Date();
    expect(
      fixture.componentInstance.days.some(day => day.date.toDateString() === today.toDateString())
    ).toBe(true);
  });

  it('switches views for the visit without overwriting the saved default', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setView('day');
    fixture.detectChanges();
    expect(component.view).toBe('day');
    expect(component.days.length).toBe(1);
    // setView never writes through to CalendarViewService.
    expect(calendarViewService.getView).toHaveBeenCalledTimes(1);

    component.setView('lunar');
    expect(component.view).toBe('day');
  });

  it('renders a flat chronological list in agenda view', () => {
    service.getItems.and.returnValue(
      of([
        {
          id: 'later',
          title: 'Later appointment',
          category: 'Fitness',
          status: 'Booked',
          startDateTime: new Date(2026, 8, 20, 14).toISOString(),
          endDateTime: new Date(2026, 8, 20, 15).toISOString()
        },
        {
          id: 'sooner',
          title: 'Sooner appointment',
          category: 'Medical',
          status: 'Booked',
          startDateTime: new Date(2026, 8, 3, 9).toISOString(),
          endDateTime: new Date(2026, 8, 3, 10).toISOString()
        }
      ])
    );

    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.componentInstance.month = new Date(2026, 8, 1);
    calendarViewService.getView.and.returnValue('agenda');
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.agendaItems.map(item => item.id)).toEqual(['sooner', 'later']);
    const rendered = Array.from(
      fixture.nativeElement.querySelectorAll('.calendar-agenda__item span')
    ).map((node) => (node as HTMLElement).textContent?.trim());
    expect(rendered).toEqual(['Sooner appointment', 'Later appointment']);
    expect(fixture.nativeElement.querySelector('.calendar-grid')).toBeNull();
  });

  it('applies a saved day default by showing today', () => {
    authService.getCurrentUser.and.returnValue({ id: 'user-9' } as never);
    calendarViewService.getView.and.returnValue('day');

    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const today = new Date();
    expect(component.days.length).toBe(1);
    expect(component.days[0].date.toDateString()).toBe(today.toDateString());
  });

  it('shows the selected day’s appointments in day view and steps one day at a time', () => {
    service.getItems.and.returnValue(
      of([
        {
          id: 'day-appt',
          title: 'Day appointment',
          category: 'Beauty',
          status: 'Booked',
          startDateTime: new Date(2027, 2, 15, 10).toISOString(),
          endDateTime: new Date(2027, 2, 15, 11).toISOString()
        }
      ])
    );

    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.setView('day');
    // Move the anchor after the switch so the assertion never depends on "today".
    component.month = new Date(2027, 2, 15);
    component.refresh();
    fixture.detectChanges();

    expect(component.days.length).toBe(1);
    expect(component.days[0].date.toDateString()).toBe(new Date(2027, 2, 15).toDateString());
    expect(component.days[0].items.map(item => item.id)).toEqual(['day-appt']);

    // The fetch covers exactly the selected day: [day, day + 1).
    const [from, to] = service.getItems.calls.mostRecent().args as [Date, Date];
    expect(from.toDateString()).toBe(new Date(2027, 2, 15).toDateString());
    expect(to.toDateString()).toBe(new Date(2027, 2, 16).toDateString());

    // The day renders as an agenda-style list covering only this day.
    expect(fixture.nativeElement.querySelector('.calendar-grid')).toBeNull();
    const rendered = Array.from(
      fixture.nativeElement.querySelectorAll('.calendar-agenda--day .calendar-agenda__item')
    );
    expect(rendered.length).toBe(1);
    const entry = rendered[0] as HTMLElement;
    expect(entry.className).toContain('beauty');
    expect(entry.querySelector('time')?.textContent?.trim()).toBe('10:00 AM – 11:00 AM');
    expect(entry.querySelector('span')?.textContent?.trim()).toBe('Day appointment');

    component.nextMonth(); // "next day"
    fixture.detectChanges();
    expect(component.days[0].date.toDateString()).toBe(new Date(2027, 2, 16).toDateString());
    expect(component.days[0].items).toEqual([]);
    // An empty day falls back to the single-day empty state.
    expect(fixture.nativeElement.querySelector('.calendar-agenda__item')).toBeNull();
    expect(fixture.nativeElement.querySelector('.calendar-agenda__empty')?.textContent?.trim())
      .toBe('No appointments on this day.');
  });

  it('anchors week and day views on today when switching from the month view', () => {
    const fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    const today = new Date();

    component.month = new Date(today.getFullYear(), today.getMonth(), 1);
    component.setView('week');
    fixture.detectChanges();

    expect(component.days.length).toBe(7);
    expect(
      component.days.some(day => day.date.toDateString() === today.toDateString())
    ).toBe(true);

    // Returning to the month restores the 1st anchor and an aligned Sunday grid.
    component.setView('month');
    expect(component.month.getDate()).toBe(1);
    const first = new Date(component.month.getFullYear(), component.month.getMonth(), 1);
    expect(component.days[0].date.toDateString())
      .toBe(new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay()).toDateString());

    component.setView('day');
    fixture.detectChanges();
    expect(component.days[0].date.toDateString()).toBe(today.toDateString());
  });
});
