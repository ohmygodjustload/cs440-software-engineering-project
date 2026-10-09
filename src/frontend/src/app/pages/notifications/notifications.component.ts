/**
 * notifications.component.ts — NotificationsComponent at "/notifications".
 * In-browser delivery only (email is out of scope). Each section
 * loads/fails independently; toggles save immediately and pessimistically.
 */

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import {
  AppNotification,
  NOTIFICATION_EVENT_LABELS,
  NotificationPreferences
} from '../../core/models/notification';
import { User } from '../../core/models/user';
import { NotificationsService } from '../../core/services/notifications.service';
import { UserSettingsService } from '../../core/services/user-settings.service';

type SectionState = 'loading' | 'loaded' | 'error';
type PreferenceKey = keyof NotificationPreferences;

/** One row in the reminder schedule section. */
interface ReminderRow {
  readonly key: 'reminderDayBeforeEnabled' | 'reminderHourBeforeEnabled';
  readonly timing: string;
  readonly controlId: string;
  readonly labelId: string;
}

const REMINDER_ROWS: readonly ReminderRow[] = [
  {
    key: 'reminderDayBeforeEnabled',
    timing: '1 day before',
    controlId: 'notifications-reminder-day',
    labelId: 'notifications-reminder-day-label'
  },
  {
    key: 'reminderHourBeforeEnabled',
    timing: '1 hour before',
    controlId: 'notifications-reminder-hour',
    labelId: 'notifications-reminder-hour-label'
  }
];

@Component({
  selector: 'app-notifications',
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.css'
})
export class NotificationsComponent implements OnInit {
  private readonly settingsService = inject(UserSettingsService);
  private readonly notificationsService = inject(NotificationsService);

  readonly reminderRows = REMINDER_ROWS;

  currentUser: User | null = null;
  userState: SectionState = 'loading';
  userError: string | null = null;

  preferences: NotificationPreferences | null = null;
  prefsState: SectionState = 'loading';
  prefsError: string | null = null;
  /** Which preference key is currently being persisted (blocks repeats). */
  savingKey: PreferenceKey | null = null;
  /** Last save failure; the last confirmed state stays rendered. */
  saveError: string | null = null;

  history: AppNotification[] = [];
  historyState: SectionState = 'loading';
  historyError: string | null = null;

  markAllReadSaving = false;
  markAllReadError: string | null = null;
  markAllReadDone = false;

  ngOnInit(): void {
    this.loadAll();
  }

  /** Read-only recipient summary. Only in-browser delivery exists. */
  get recipientSummary(): string {
    return 'In-browser · only you';
  }

  get unreadCount(): number {
    return this.history.filter((item) => !item.isRead).length;
  }

  get canMarkAllRead(): boolean {
    return (
      this.historyState === 'loaded' &&
      this.unreadCount > 0 &&
      !this.markAllReadSaving
    );
  }

  retryUser(): void {
    this.loadAll();
  }

  retryPreferences(): void {
    if (!this.currentUser) {
      this.loadAll();
      return;
    }
    this.loadPreferences(this.currentUser.id);
  }

  retryHistory(): void {
    if (!this.currentUser) {
      this.loadAll();
      return;
    }
    this.loadHistory(this.currentUser.id);
  }

  statusLabel(enabled: boolean): string {
    return enabled ? 'Enabled' : 'Disabled';
  }

  stateLabel(enabled: boolean): string {
    return enabled ? 'ON' : 'OFF';
  }

  eventLabel(item: AppNotification): string {
    if (item.eventLabel?.trim()) {
      return item.eventLabel;
    }
    return NOTIFICATION_EVENT_LABELS[item.event] ?? item.event;
  }

  formatTimestamp(iso: string): string {
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) {
      return iso;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date(iso));
  }

  isSaving(key: PreferenceKey): boolean {
    return this.savingKey === key;
  }

  isToggleBusy(key: PreferenceKey): boolean {
    return this.savingKey === key;
  }

  onToggle(key: PreferenceKey, next: boolean): void {
    if (!this.currentUser || !this.preferences || this.savingKey) {
      return;
    }
    if (this.preferences[key] === next) {
      return;
    }
    this.savingKey = key;
    this.saveError = null;

    this.notificationsService
      .updatePreferences(this.currentUser.id, { [key]: next } as Partial<NotificationPreferences>)
      .subscribe({
        next: (confirmed) => {
          this.preferences = { ...confirmed };
          this.savingKey = null;
        },
        error: (error: unknown) => {
          this.savingKey = null;
          this.saveError =
            error instanceof Error && error.message
              ? error.message
              : 'Could not save that preference. The last saved state is still shown.';
        }
      });
  }

  markAllRead(): void {
    if (!this.currentUser || !this.canMarkAllRead) {
      return;
    }
    this.markAllReadSaving = true;
    this.markAllReadError = null;
    this.markAllReadDone = false;

    this.notificationsService.markAllRead(this.currentUser.id).subscribe({
      next: () => {
        this.history = this.history.map((item) => ({ ...item, isRead: true }));
        this.markAllReadSaving = false;
        this.markAllReadDone = true;
      },
      error: (error: unknown) => {
        this.markAllReadSaving = false;
        this.markAllReadError =
          error instanceof Error && error.message
            ? error.message
            : 'Could not mark notifications as read. Read states are unchanged.';
      }
    });
  }

  private loadAll(): void {
    this.userState = 'loading';
    this.userError = null;
    this.prefsState = 'loading';
    this.prefsError = null;
    this.historyState = 'loading';
    this.historyError = null;
    this.saveError = null;
    this.markAllReadError = null;
    this.markAllReadDone = false;

    this.settingsService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.userState = 'loaded';
        this.loadPreferences(user.id);
        this.loadHistory(user.id);
      },
      error: (error: unknown) => {
        this.userState = 'error';
        const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
        this.userError = `Could not load your account${detail}. Preferences and history need it. Please try again.`;
        this.prefsState = 'error';
        this.prefsError = 'Preferences need your account to load first.';
        this.historyState = 'error';
        this.historyError = 'History needs your account to load first.';
      }
    });
  }

  private loadPreferences(userId: string): void {
    this.prefsState = 'loading';
    this.prefsError = null;
    this.saveError = null;

    this.notificationsService.getPreferences(userId).subscribe({
      next: (prefs) => {
        this.preferences = { ...prefs };
        this.prefsState = 'loaded';
      },
      error: (error: unknown) => {
        this.prefsState = 'error';
        this.prefsError =
          error instanceof Error && error.message
            ? error.message
            : 'Could not load notification preferences. Please try again.';
      }
    });
  }

  private loadHistory(userId: string): void {
    this.historyState = 'loading';
    this.historyError = null;
    this.markAllReadError = null;
    this.markAllReadDone = false;

    this.notificationsService.getNotifications(userId).subscribe({
      next: (items) => {
        this.history = [...items].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.historyState = 'loaded';
      },
      error: (error: unknown) => {
        this.historyState = 'error';
        this.historyError =
          error instanceof Error && error.message
            ? error.message
            : 'Could not load notification history. Please try again.';
      }
    });
  }


}


