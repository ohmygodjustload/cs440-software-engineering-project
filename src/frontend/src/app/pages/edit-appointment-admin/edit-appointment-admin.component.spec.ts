import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { EditAppointmentAdminComponent } from './edit-appointment-admin.component';

describe('EditAppointmentAdminComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;

  function create() {
    TestBed.configureTestingModule({
      imports: [EditAppointmentAdminComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { providerId: 'p1' } } } }
      ]
    });
    const fixture = TestBed.createComponent(EditAppointmentAdminComponent);
    fixture.detectChanges();
    return fixture;
  }

  function futureDate(): string {
    // One week out so 'isPastTime' never trips, no matter when the test runs.
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser', 'getErrorMessage']);
    auth.getCurrentUser.and.returnValue({
      id: 'u1',
      firstName: 'John',
      lastName: 'Smith',
      username: 'JohnSmith123',
      isClient: false,
      isServiceProvider: true,
      isAdmin: false,
      isActive: true,
      serviceTypes: ['Medical']
    });
  });

  it('exposes 18 start times from 9:00 AM through 5:30 PM, including noon', () => {
    const component = create().componentInstance;

    expect(component.startTimes.length).toBe(18);
    expect(component.startTimes[0]).toBe('09:00');
    expect(component.startTimes[component.startTimes.length - 1]).toBe('17:30');
    expect(component.startTimes).toContain('12:00');
    expect(component.startTimes).toContain('12:30');
  });

  it('selects 3:30 PM on a future date and sets the end 60 minutes later', () => {
    const component = create().componentInstance;
    const date = futureDate();

    component.chooseDate(date);
    component.chooseTime('15:30');

    expect(component.draft.start).toBe(`${date}T15:30`);
    const minutes = (Date.parse(component.draft.end) - Date.parse(component.draft.start)) / 60000;
    expect(minutes).toBe(60);
  });

  it('selects 5:30 PM on a future date and sets the end 60 minutes later', () => {
    const component = create().componentInstance;
    const date = futureDate();

    component.chooseDate(date);
    component.chooseTime('17:30');

    expect(component.draft.start).toBe(`${date}T17:30`);
    const minutes = (Date.parse(component.draft.end) - Date.parse(component.draft.start)) / 60000;
    expect(minutes).toBe(60);
  });

  it('renders 18 start-time buttons with 5:30 PM last and 12:00 PM present', () => {
    const fixture = create();
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.time-options button')
    );
    const labels = buttons.map((button) => button.textContent?.trim());

    expect(buttons.length).toBe(18);
    expect(labels[labels.length - 1]).toBe('5:30 PM');
    expect(labels).toContain('12:00 PM');
  });
});
