import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import { User } from '../../core/models/user';
import {
  CALENDAR_VIEWS,
  SETTINGS_TABS,
  SettingsFormValue,
  SettingsTabId,
  TIME_ZONES
} from '../../core/models/user-settings';
import { UserSettingsService } from '../../core/services/user-settings.service';

/** Full-name alphabet: Unicode letters/marks plus everyday punctuation. */
const FULL_NAME_PATTERN = /^[\p{L}\p{M} .'\-]+$/u;

/**
 * Permissive phone check: empty is allowed (phone is optional); otherwise the
 * value must contain at least 7 digits and only telephone punctuation.
 */
export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = (control.value ?? '').toString().trim();
    if (raw === '') {
      return null;
    }
    const digits = raw.replace(/\D/g, '');
    const allowed = /^[+()\-.\s\d]+(?:\s*(?:x|ext\.?|extension)\s*\d+)?$/i.test(raw);
    if (!allowed || digits.length < 7 || raw.length > 50) {
      return { phone: true };
    }
    return null;
  };
}

type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly settingsService = inject(UserSettingsService);

  readonly tabs = SETTINGS_TABS;
  readonly timeZones = TIME_ZONES;
  readonly calendarViews = CALENDAR_VIEWS;

  activeTabId: SettingsTabId = 'profile';
  loadState: LoadState = 'loading';
  loadError: string | null = null;
  saveError: string | null = null;
  saveSuccess = false;
  saving = false;
  currentUser: User | null = null;
  private savedBaseline: SettingsFormValue | null = null;

  readonly form = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(FULL_NAME_PATTERN)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
    phone: ['', [phoneValidator()]],
    timeZone: ['UTC', [Validators.required]],
    defaultCalendarView: ['month', [Validators.required]],
    notifyMedical: [true],
    notifyBeauty: [true],
    notifyFitness: [true]
  });

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  selectTab(id: SettingsTabId): void {
    const tab = this.tabs.find((entry) => entry.id === id);
    if (tab?.available) {
      this.activeTabId = id;
      this.saveSuccess = false;
    }
  }

  /** Keyboard support for the tablist: arrows move between enabled tabs. */
  onTabKeydown(event: KeyboardEvent, id: SettingsTabId): void {
    const order = this.tabs.filter((tab) => tab.available).map((tab) => tab.id);
    const current = order.indexOf(id);
    if (current < 0) {
      return;
    }
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % order.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + order.length) % order.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = order.length - 1;
    }
    if (next !== null) {
      event.preventDefault();
      const target = order[next];
      this.selectTab(target);
      document.getElementById(`settings-tab-${target}`)?.focus();
    }
  }

  get isLoading(): boolean {
    return this.loadState === 'loading';
  }

  get isDirty(): boolean {
    if (!this.savedBaseline) {
      return false;
    }
    return JSON.stringify(this.savedBaseline) !== JSON.stringify(this.form.getRawValue());
  }

  get canSave(): boolean {
    return this.loadState === 'loaded' && this.isDirty && !this.saving && this.form.valid;
  }

  /** Display username from the loaded record (read-only; never invented). */
  get username(): string {
    return this.currentUser?.username ?? '—';
  }

  /** Human-readable account roles from the loaded record. */
  get roleSummary(): string {
    const roles: string[] = [];
    if (this.currentUser?.isAdmin) {
      roles.push('Admin');
    }
    if (this.currentUser?.isServiceProvider) {
      roles.push('Service provider');
    }
    if (this.currentUser?.isClient) {
      roles.push('Client');
    }
    return roles.length > 0 ? roles.join(', ') : '—';
  }

  resolveDefaultTimeZone(): string {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone && this.timeZones.some((o) => o.value === zone)) {
        return zone;
      }
    } catch {
      // Intl unavailable: fall through to UTC.
    }
    return 'UTC';
  }

  retryLoad(): void {
    this.loadCurrentUser();
  }

  onSave(): void {
    if (this.saving || !this.isDirty) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    this.saveError = null;
    this.saveSuccess = false;

    this.settingsService.saveSettings().subscribe({
      next: () => {
        this.saving = false;
        this.savedBaseline = { ...this.form.getRawValue() };
        this.saveSuccess = true;
        this.form.markAsPristine();
      },
      error: (error: unknown) => {
        this.saving = false;
        this.saveError =
          error instanceof Error && error.message
            ? error.message
            : 'Saving failed. Your edits have been kept on this page.';
      }
    });
  }

  private loadCurrentUser(): void {
    this.loadState = 'loading';
    this.loadError = null;

    this.settingsService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        const initial = this.toFormValue(user);
        this.form.reset(initial);
        this.savedBaseline = { ...initial };
        this.loadState = 'loaded';
      },
      error: (error: unknown) => {
        this.loadState = 'error';
        const detail = error instanceof Error && error.message ? ` (${error.message})` : '';
        this.loadError = `Could not load your settings${detail}. Please try again.`;
      }
    });
  }

  private toFormValue(user: User): SettingsFormValue {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.replace(/\s+/g, ' ').trim();
    return {
      fullName,
      email: user.email ?? '',
      phone: user.phone ?? '',
      timeZone: this.resolveDefaultTimeZone(),
      defaultCalendarView: 'month',
      notifyMedical: true,
      notifyBeauty: true,
      notifyFitness: true
    };
  }
}


