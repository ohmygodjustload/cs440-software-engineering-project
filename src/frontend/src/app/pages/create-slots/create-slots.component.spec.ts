import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
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

  it('exposes 12 start times, ending with 2:30, 3:00, and 3:30 PM', () => {
    const component = create().componentInstance;

    expect(component.startTimes.length).toBe(12);
    expect(component.startTimes.slice(-3)).toEqual(['14:30', '15:00', '15:30']);
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

  it('renders 12 start-time buttons with 3:30 PM last', () => {
    const fixture = create();
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('.time-options button')
    );

    expect(buttons.length).toBe(12);
    expect(buttons[buttons.length - 1].textContent?.trim()).toBe('3:30 PM');
  });
});
