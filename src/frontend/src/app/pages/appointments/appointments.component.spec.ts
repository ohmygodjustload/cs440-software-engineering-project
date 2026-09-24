/**
 * appointments.component.spec.ts — unit tests for AppointmentsComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Appointments Here!". Rewrite these expectations alongside the real scheduler.
 *
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentsComponent } from './appointments.component';

describe('AppointmentsComponent', () => {
  let fixture: ComponentFixture<AppointmentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppointmentsComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the page placeholder text', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent?.trim()).toBe('Appointments Here!');
  });
});
