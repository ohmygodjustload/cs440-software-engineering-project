/**
 * notifications.component.spec.ts — unit tests for NotificationsComponent.
 * Covers heading/subtitle, preference loading, independent toggles, failure
 * rollback, history states, mark-all-read, timestamps, and accessible names.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { User } from '../../core/models/user';
import { NotificationsService } from '../../core/services/notifications.service';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { NotificationsComponent } from './notifications.component';

const demoUser: User = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Porter',
  username: 'JanePorter123',
  email: 'jane@example.com',
  phone: '456-456-4567',
  isClient: true,
  isServiceProvider: false,
  isAdmin: false
};

const loadedPrefs = {
  inBrowserEnabled: true,
  reminderDayBeforeEnabled: false,
  reminderHourBeforeEnabled: true
};

const historyItems = [
  {
    id: 'n2',
    userId: 'user-1',
    event: 'appointment-edited' as const,
    eventLabel: 'Appointment edited',
    message: 'Haircut',
    appointmentId: 'a2',
    createdAt: '2026-09-18T15:40:00Z',
    isRead: true
  },
  {
    id: 'n1',
    userId: 'user-1',
    event: 'appointment-created' as const,
    eventLabel: 'Appointment created',
    message: 'Annual physical',
    appointmentId: 'a1',
    createdAt: '2026-09-19T09:16:00Z',
    isRead: false
  }
];

function configure(
  settingsStub: Partial<UserSettingsService>,
  notificationsStub: Partial<NotificationsService>
): ComponentFixture<NotificationsComponent> {
  TestBed.configureTestingModule({
    imports: [NotificationsComponent],
    providers: [
      { provide: UserSettingsService, useValue: settingsStub },
      { provide: NotificationsService, useValue: notificationsStub }
    ]
  });
  TestBed.compileComponents();
  const fixture = TestBed.createComponent(NotificationsComponent);
  fixture.detectChanges();
  return fixture;
}

function loadedFixture(): ComponentFixture<NotificationsComponent> {
  return configure(
    { getCurrentUser: () => of(demoUser) },
    {
      getPreferences: () => of({ ...loadedPrefs }),
      updatePreferences: (_id: string, patch: object) => of({ ...loadedPrefs, ...patch }),
      getNotifications: () => of([...historyItems]),
      markAllRead: () => of({ updated: 1 })
    }
  );
}
describe('NotificationsComponent', () => {
  it('should render the exact heading and subtitle', () => {
    const fixture = loadedFixture();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('h1')?.textContent).toBe('Notifications');
    expect(root.textContent).toContain('Manage delivery preferences and review reminder status.');
  });

  it('should reflect saved preference states without hardcoding ON', () => {
    const fixture = loadedFixture();
    const root = fixture.nativeElement as HTMLElement;
    const day = root.querySelector('#notifications-reminder-day');
    const hour = root.querySelector('#notifications-reminder-hour');
    expect(day?.getAttribute('aria-checked')).toBe('false');
    expect(hour?.getAttribute('aria-checked')).toBe('true');
    expect(root.textContent).toContain('Disabled');
    expect(root.textContent).toContain('In-browser notifications');
  });

  it('should update reminders independently and patch only one key', () => {
    const seen: object[] = [];
    const fixture = configure(
      { getCurrentUser: () => of(demoUser) },
      {
        getPreferences: () => of({ ...loadedPrefs }),
        updatePreferences: (_id: string, patch: object) => {
          seen.push(patch);
          return of({ ...loadedPrefs, ...patch });
        },
        getNotifications: () => of([])
      }
    );
    const component = fixture.componentInstance;
    component.onToggle('reminderDayBeforeEnabled', true);
    expect(seen).toEqual([{ reminderDayBeforeEnabled: true }]);
    expect(component.preferences?.reminderDayBeforeEnabled).toBe(true);
    expect(component.preferences?.reminderHourBeforeEnabled).toBe(true);
  });

  it('should restore the prior confirmed state when saving fails', () => {
    const fixture = configure(
      { getCurrentUser: () => of(demoUser) },
      {
        getPreferences: () => of({ ...loadedPrefs }),
        updatePreferences: () => throwError(() => new Error('offline')),
        getNotifications: () => of([])
      }
    );
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.onToggle('inBrowserEnabled', false);
    fixture.detectChanges();
    expect(component.preferences?.inBrowserEnabled).toBe(true);
    expect(component.saveError).toContain('offline');
    expect(fixture.nativeElement.textContent).toContain('offline');
  });

  it('should render real history records newest first with read state', () => {
    const fixture = loadedFixture();
    fixture.detectChanges();
    const rows = Array.from(
      fixture.nativeElement.querySelectorAll('.notifications-history__row')
    ).map((r) => (r as HTMLElement).textContent ?? '');
    expect(rows.length).toBe(2);
    expect(rows[0]).toContain('Appointment created');
    expect(rows[0]).toContain('Annual physical');
    expect(rows[0]).toContain('Unread');
    expect(rows[1]).toContain('Appointment edited');
    expect(fixture.componentInstance.history[0].id).toBe('n1');
  });

  it('should show the empty state when there is no history', () => {
    const fixture = configure(
      { getCurrentUser: () => of(demoUser) },
      {
        getPreferences: () => of({ ...loadedPrefs }),
        updatePreferences: () => of({ ...loadedPrefs }),
        getNotifications: () => of([])
      }
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No notifications yet.');
  });

  it('should show retry states when sections fail', () => {
    const fixture = configure(
      { getCurrentUser: () => of(demoUser) },
      {
        getPreferences: () => throwError(() => new Error('prefs down')),
        updatePreferences: () => of({ ...loadedPrefs }),
        getNotifications: () => throwError(() => new Error('history down'))
      }
    );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('prefs down');
    expect(text).toContain('history down');
  });

  it('should disable mark-all-read with no unread and update on success', () => {
    const fixture = loadedFixture();
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '.notifications-mark'
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    component.markAllRead();
    fixture.detectChanges();
    expect(component.unreadCount).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('marked as read');
    expect(button.disabled).toBe(true);
  });

  it('should preserve read state when mark-all-read fails', () => {
    const fixture = configure(
      { getCurrentUser: () => of(demoUser) },
      {
        getPreferences: () => of({ ...loadedPrefs }),
        updatePreferences: () => of({ ...loadedPrefs }),
        getNotifications: () => of([...historyItems]),
        markAllRead: () => throwError(() => new Error('bulk down'))
      }
    );
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.markAllRead();
    fixture.detectChanges();
    expect(component.unreadCount).toBe(1);
    expect(component.markAllReadError).toContain('bulk down');
  });

  it('should format timestamps and expose accessible switches', () => {
    const fixture = loadedFixture();
    const component = fixture.componentInstance;
    expect(component.formatTimestamp('2026-09-19T09:16:00Z')).toContain('Sep 19');
    expect(component.formatTimestamp('not-a-date')).toBe('not-a-date');
    const root = fixture.nativeElement as HTMLElement;
    const toggle = root.querySelector('#notifications-inbrowser');
    expect(toggle?.getAttribute('role')).toBe('switch');
    expect(toggle?.getAttribute('aria-checked')).toBe('true');
    const day = root.querySelector('#notifications-reminder-day');
    expect(day?.getAttribute('aria-labelledby')).toContain('notifications-reminder-day-label');
  });
});


