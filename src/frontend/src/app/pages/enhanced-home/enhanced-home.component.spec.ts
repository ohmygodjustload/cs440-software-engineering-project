import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Appointment } from '../../core/models/appointment';
import { AuthService } from '../../core/services/auth.service';
import { EnhancedHomeService } from '../../core/services/enhanced-home.service';
import { EnhancedHomeComponent } from './enhanced-home.component';

describe('EnhancedHomeComponent', () => {
  const now = new Date(2026, 9, 29, 10);
  let service: jasmine.SpyObj<EnhancedHomeService>;
  function item(id: string, status: Appointment['status'], startHour = 11, dayOffset = 0): Appointment {
    const start = new Date(2026, 9, 29 + dayOffset, startHour);
    return { id, title: 'Annual physical', category: 'Medical', status,
      startDateTime: start.toISOString(), endDateTime: new Date(+start + 3600000).toISOString(),
      userId: status === 'Available' ? null : 'client-1', providerId: 'provider-1', location: 'Hospital' };
  }
  function create() {
    TestBed.configureTestingModule({ imports: [EnhancedHomeComponent], providers: [provideRouter([]),
      { provide: EnhancedHomeService, useValue: service },
      { provide: AuthService, useValue: { getCurrentUser: () => ({ firstName: 'Jane' }) } }
    ] });
    const fixture = TestBed.createComponent(EnhancedHomeComponent);
    fixture.detectChanges();
    return fixture;
  }
  beforeEach(() => {
    jasmine.clock().install(); jasmine.clock().mockDate(now);
    service = jasmine.createSpyObj<EnhancedHomeService>('EnhancedHomeService', ['clientAppointments', 'providerAppointments']);
    service.clientAppointments.and.returnValue(of([]));
    service.providerAppointments.and.returnValue(of([]));
  });
  afterEach(() => jasmine.clock().uninstall());
  it('shows both workspaces and valid actions without test identities or a picker', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Jane');
    expect(text).toContain('As a client');
    expect(text).toContain('As a service provider');
    expect(text).not.toContain('demo-user');
    expect(fixture.nativeElement.querySelector('select')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/create-slots"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[href="/book-appointment"]')).toBeTruthy();
  });
  it('counts each role separately and excludes available and canceled slots', () => {
    service.clientAppointments.and.returnValue(of([item('my-booking', 'Booked')]));
    service.providerAppointments.and.returnValue(of([item('booking', 'Booked'), item('open', 'Available'), item('canceled', 'Canceled')]));
    const component = create().componentInstance;
    expect(component.todayCount(component.client)).toBe(1);
    expect(component.todayCount(component.provider)).toBe(1);
    expect(component.weekCount(component.provider)).toBe(1);
  });
  it('keeps the client panel working when provider loading fails', () => {
    service.clientAppointments.and.returnValue(of([item('mine', 'Booked')]));
    service.providerAppointments.and.returnValue(throwError(() => new Error('Offline')));
    const component = create().componentInstance;
    expect(component.client.items.length).toBe(1);
    expect(component.client.error).toBe('');
    expect(component.provider.error).toBeTruthy();
    service.providerAppointments.and.returnValue(of([]));
    component.load(component.provider);
    expect(component.provider.error).toBe('');
  });
  it('shows loading and suppresses duplicate requests per panel', () => {
    const pending = new Subject<Appointment[]>();
    service.clientAppointments.and.returnValue(pending);
    const component = create().componentInstance;
    component.load(component.client);
    expect(service.clientAppointments).toHaveBeenCalledTimes(1);
    expect(component.client.loading).toBeTrue();
    pending.next([]); pending.complete();
    expect(component.client.loading).toBeFalse();
  });
  it('shows sorted future open slots only and allows viewing availability', () => {
    const alreadyBooked = { ...item('taken', 'Available'), userId: 'other' };
    service.providerAppointments.and.returnValue(of([
      item('late', 'Available', 14), item('early', 'Available', 11),
      item('past', 'Available', 8), alreadyBooked, item('booking', 'Booked')
    ]));
    const fixture = create();
    const component = fixture.componentInstance;
    expect(component.openSlots.map(slot => slot.id)).toEqual(['early', 'late']);
    component.showAvailability = true; fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.open-slot').length).toBe(2);
  });
  it('includes an in-progress booking as next and keeps it out of recent history', () => {
    service.clientAppointments.and.returnValue(of([
      item('current', 'Booked', 9), item('later', 'Booked', 12), item('old', 'Booked', 8)
    ]));
    const component = create().componentInstance;
    component.now = new Date(2026, 9, 29, 9, 30);
    expect(component.next(component.client)?.id).toBe('current');
    expect(component.recent(component.client).map(entry => entry.id)).toEqual(['old']);
  });
  it('renders the appointment title and location in details', () => {
    service.providerAppointments.and.returnValue(of([item('booking', 'Booked')]));
    const fixture = create();
    const component = fixture.componentInstance;
    component.showDetails(component.provider.items[0], component.provider);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.details').textContent).toContain('Annual physical');
    expect(fixture.nativeElement.querySelector('.details').textContent).toContain('Hospital');
  });
});
