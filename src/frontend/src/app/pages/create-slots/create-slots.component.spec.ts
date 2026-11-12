import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { Slot } from '../../core/models/slot';
import { CreateSlotsComponent } from './create-slots.component';

describe('CreateSlotsComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;

  function create() {
    TestBed.configureTestingModule({
      imports: [CreateSlotsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { providerId: 'p1' } } } }
      ]
    });
    const fixture = TestBed.createComponent(CreateSlotsComponent);
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

  it('exposes nine hourly blocks from 9:00 AM through 5:00 PM', () => {
    const component = create().componentInstance;

    expect(component.startTimes.length).toBe(9);
    expect(component.startTimes[0]).toBe('09:00');
    expect(component.startTimes[component.startTimes.length - 1]).toBe('17:00');
    expect(component.startTimes).toContain('12:00');
    expect(component.startTimes).not.toContain('12:30');
  });

  it('selects 3:00–4:00 PM on a future date', () => {
    const component = create().componentInstance;
    const date = futureDate();

    component.chooseDate(date);
    component.chooseTime('15:00');

    expect(component.draft.start).toBe(`${date}T15:00`);
    const minutes = (Date.parse(component.draft.end) - Date.parse(component.draft.start)) / 60000;
    expect(minutes).toBe(60);
  });

  it('selects the final 5:00–6:00 PM block', () => {
    const component = create().componentInstance;
    const date = futureDate();

    component.chooseDate(date);
    component.chooseTime('17:00');

    expect(component.draft.start).toBe(`${date}T17:00`);
    expect(component.draft.end).toBe(`${date}T18:00`);
    const minutes = (Date.parse(component.draft.end) - Date.parse(component.draft.start)) / 60000;
    expect(minutes).toBe(60);
  });

  it('renders nine one-hour ranges from 9:00–10:00 AM through 5:00–6:00 PM', () => {
    const fixture = create();
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.time-options button')
    );
    const labels = buttons.map((button) => button.textContent?.trim());

    expect(buttons.length).toBe(9);
    expect(labels[0]).toBe('9:00 AM – 10:00 AM');
    expect(labels[labels.length - 1]).toBe('5:00 PM – 6:00 PM');
    expect(labels).toContain('12:00 PM – 1:00 PM');
  });

  it('does not highlight an empty required field before publishing is attempted', () => {
    const fixture = create();
    const titleInput: HTMLInputElement = fixture.nativeElement.querySelector('#service');

    titleInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(titleInput.classList).not.toContain('field-invalid');
    expect(fixture.nativeElement.querySelector('.field-invalid-label')).toBeNull();
  });

  it('highlights invalid fields after submitting missing required values', () => {
    const fixture = create();

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    const invalidFields = fixture.nativeElement.querySelectorAll('.field-invalid');
    const locationInput: HTMLInputElement = fixture.nativeElement.querySelector('#location');
    expect(invalidFields.length).toBeGreaterThanOrEqual(2);
    expect(locationInput.classList).toContain('field-invalid');
    expect(fixture.nativeElement.querySelector('.field-invalid-label')).not.toBeNull();
    expect(text).toContain('Highlighted fields are required.');
  });

  it('marks only the overlapping one-hour block unavailable', () => {
    const component = create().componentInstance;
    const date = futureDate();
    component.chooseDate(date);
    component.existingSlots = [{
      id: 'slot-1',
      title: 'General checkup',
      category: 'Medical',
      startDateTime: new Date(`${date}T14:00`).toISOString(),
      endDateTime: new Date(`${date}T15:00`).toISOString(),
      providerId: 'p1',
      providerName: 'John Smith',
      userId: null,
      appointmentTypeId: 'type-1',
      location: 'Clinic',
      notes: '',
      status: 'Available'
    } satisfies Slot];

    expect(component.isTimeUnavailable('13:00')).toBeFalse();
    expect(component.isTimeUnavailable('14:00')).toBeTrue();
    expect(component.isTimeUnavailable('15:00')).toBeFalse();
  });
});
