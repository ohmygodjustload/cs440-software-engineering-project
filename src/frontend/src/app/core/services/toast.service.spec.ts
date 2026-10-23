/**
 * toast.service.spec.ts — unit tests for ToastService.
 *
 * Purpose: locks in the top-right popup contract — default duration, manual
 * dismiss, leave-animation removal, bounded stack, and the exact helper copy
 * ("You're Logged In!", booked/updated/deleted/cancelled, settings updated).
 */

import { fakeAsync, TestBed, tick } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created with no popups', () => {
    expect(service).toBeTruthy();
    expect(service.toasts).toEqual([]);
  });

  it('should show a popup with defaults and auto-dismiss it', fakeAsync(() => {
    const id = service.show({ title: 'Hello' });

    expect(service.toasts.length).toBe(1);
    expect(service.toasts[0].id).toBe(id);
    expect(service.toasts[0].durationMs).toBe(5000);
    expect(service.toasts[0].leaving).toBeFalse();

    tick(5000);
    expect(service.toasts[0].leaving).toBeTrue();
    tick(350);
    expect(service.toasts).toEqual([]);
  }));

  it('should dismiss early via the X and finish the leave animation', fakeAsync(() => {
    const id = service.show({ title: 'Hello' });

    service.dismiss(id);
    expect(service.toasts[0].leaving).toBeTrue();

    tick(350);
    expect(service.toasts).toEqual([]);
  }));

  it('should show "You\'re Logged In!" first', () => {
    service.showLoggedIn();

    expect(service.toasts[0].title).toBe(`You're Logged In!`);
  });

  it('should show "You\'re Logged Out!" on sign-out', () => {
    service.show({ title: 'stale' });
    service.clear();
    service.showLoggedOut();

    expect(service.toasts.length).toBe(1);
    expect(service.toasts[0].title).toBe(`You're Logged Out!`);
  });

  it('should cancel pending auto-dismiss timers when cleared', fakeAsync(() => {
    const id = service.show({ title: 'stale' });
    service.clear();

    tick(10000);

    expect(service.toasts).toEqual([]);
    // The stale timer must not resurrect or touch the fresh logout popup.
    service.showLoggedOut();
    expect(service.toasts.length).toBe(1);
    expect(service.toasts[0].id).not.toBe(id);
  }));

  it('should bound the stack to the newest popups', () => {
    for (let index = 0; index < 6; index++) {
      service.show({ title: `Toast ${index}` });
    }

    expect(service.toasts.length).toBe(4);
    expect(service.toasts[0].title).toBe('Toast 2');
    expect(service.toasts[3].title).toBe('Toast 5');
  });

  it('should expose appointment booked/updated/deleted/cancelled copy', () => {
    service.showAppointmentBooked('Annual physical', '2026-10-20T09:00:00Z');
    service.showAppointmentModified('Haircut', null);
    service.showAppointmentDeleted('Old visit');
    service.showAppointmentCancelled('Yoga', '2026-10-21T10:00:00Z');

    expect(service.toasts.map((toast) => toast.title)).toEqual([
      'Appointment booked',
      'Appointment updated',
      'Appointment deleted',
      'Appointment cancelled'
    ]);
    expect(service.toasts[0].message).toContain('Annual physical');
    expect(service.toasts[2].message).toBe('Old visit');
  });

  it('should expose missed + settings-changed copy', () => {
    service.showMissed('Appointment created', 'Annual physical');
    service.showNotificationSettingChanged('In-browser notifications disabled.');

    expect(service.toasts[0].title).toBe('Appointment created');
    expect(service.toasts[1].title).toBe('Notification settings updated');
    expect(service.toasts[1].message).toContain('In-browser notifications disabled.');
  });
});
