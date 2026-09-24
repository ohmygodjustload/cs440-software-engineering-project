/**
 * calendar.component.spec.ts — unit tests for CalendarComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Calendar Here!". Rewrite these expectations alongside the real calendar.
 *
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarComponent } from './calendar.component';

describe('CalendarComponent', () => {
  let fixture: ComponentFixture<CalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page placeholder text', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent?.trim()).toBe('Calendar Here!');
  });
});
