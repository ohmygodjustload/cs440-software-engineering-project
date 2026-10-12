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

describe('CalendarComponent', () => {
  const service = {
    getItems: jasmine.createSpy('getItems').and.returnValue(of([]))
  };

  beforeEach(async () => {
    service.getItems.calls.reset();
    service.getItems.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [CalendarComponent],
      providers: [
        { provide: CalendarService, useValue: service }
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
          status: 'Scheduled',
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
});