import { providerCategories } from '../../core/models/provider-categories';
import { SERVICE_OPTIONS } from '../../core/models/service-options';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AppointmentCategory } from '../../core/models/appointment';
import { BookingProvider, CreateSlotDraft, SlotsService } from '../../core/services/slots.service';

interface AppointmentForm {
  title: string;
  category: AppointmentCategory;
  start: string;
  end: string;
  providerId: string;
  location: string;
  notes: string;
}

@Component({
  selector: 'app-create-slots',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-slots.component.html',
  styleUrl: './create-slots.component.css'
})
export class CreateSlotsComponent implements OnInit {
  private readonly service = inject(SlotsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  get categories(): readonly AppointmentCategory[] {
    const provider = this.providers.find(item => item.id === this.draft.providerId);
    return provider ? providerCategories(provider) : [];
  }

  get today(): string {
    return this.localInput(new Date().toISOString()).split('T')[0];
  }

  providerChanged(): void {
    this.draft.category = this.categories[0] ?? 'Medical';
    this.categoryChanged();
  }

  isPastTime(time: string): boolean {
    return new Date(`${this.selectedDate}T${time}`).getTime() <= Date.now();
  }
  readonly startTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00',
    '11:30', '13:00', '13:30', '14:00'
  ];

  providers: BookingProvider[] = [];
  draft = this.emptyDraft();
  providersLoading = false;
  saving = false;
  providerError = '';
  formError = '';
  success = '';

  get filteredProviders() {
    return this.providers.filter((provider) =>
      providerCategories(provider).includes(this.draft.category));
  }

  get serviceOptions(): readonly string[] {
    return SERVICE_OPTIONS[this.draft.category];
  }

  categoryChanged(): void {
    // Clear the previous category's service so it cannot be submitted accidentally.
    this.draft.title = '';
    this.success = '';
    this.formError = '';
  }

  get selectedDate(): string {
    return this.draft.start.split('T')[0] || this.localInput(new Date().toISOString()).split('T')[0];
  }

  get selectedTime(): string {
    return this.draft.start.split('T')[1]?.slice(0, 5) || '';
  }

  get dateOptions(): { key: string; date: Date }[] {
    const selected = new Date(`${this.selectedDate}T12:00`);
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
    const count = 7;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return { key: this.localInput(date.toISOString()).split('T')[0], date };
    });
  }

  get dateLabel(): string {
    return new Date(`${this.selectedDate}T12:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  get durationMinutes(): number {
    return 60;
  }

  chooseDate(date: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < this.today) return;
    this.setStart(date, this.selectedTime || '10:30');
  }

  chooseTime(time: string): void {
    if (!this.startTimes.includes(time) || this.isPastTime(time)) return;
    this.setStart(this.selectedDate, time);
  }

  timeLabel(time: string): string {
    const [hour, minute] = time.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  private setStart(date: string, time: string): void {
    const duration = this.durationMinutes;
    this.draft.start = `${date}T${time}`;
    this.draft.end = this.localInput(new Date(Date.parse(this.draft.start) + duration * 60000).toISOString());
  }

  get selectedProviderMissing(): boolean {
    return !!this.draft.providerId &&
      !this.filteredProviders.some((provider) => provider.id === this.draft.providerId);
  }

  ngOnInit(): void {
    this.draft.providerId = this.route.snapshot.data['providerId'] ?? '';
    this.loadProviders();
  }

  loadProviders(): void {
    if (this.providersLoading) return;
    this.providersLoading = true;
    this.providerError = '';

    this.service.providers()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.providersLoading = false)
      )
      .subscribe({
        next: (providers) => {
          this.providers = providers;
          this.providerChanged();
        },
        error: () => this.providerError = 'Providers could not be loaded. Check the API and retry.'
      });
  }

  save(form: NgForm): void {
    if (this.saving) return;
    this.formError = '';
    this.success = '';
    if (this.draft.start && Number.isFinite(Date.parse(this.draft.start))) {
      this.draft.end = this.localInput(
        new Date(Date.parse(this.draft.start) + 60 * 60000).toISOString()
      );
    }
    const start = new Date(this.draft.start);
    const end = new Date(this.draft.end);

    if (form.invalid || !this.draft.title.trim() || !this.draft.providerId.trim() || !this.draft.location.trim()) {
      form.control.markAllAsTouched();
      this.formError = 'Select a provider, category, service, date, start time, and location.';
      return;
    }

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      this.formError = 'The end date and time must be after the start.';
      return;
    }

    if (start.getTime() <= Date.now()) {
      this.formError = 'Choose a future appointment time.';
      return;
    }

    if (!this.serviceOptions.includes(this.draft.title)) {
      this.formError = 'Choose a service from the selected category.';
      return;
    }

    if (!this.filteredProviders.some((provider) => provider.id === this.draft.providerId)) {
      this.formError = 'Choose a provider for the selected category.';
      return;
    }

    if (!this.categories.includes(this.draft.category)) {
      this.formError = 'Choose a category supported by this provider.';
      return;
    }

    const body: CreateSlotDraft = {
      title: this.draft.title.trim(),
      category: this.draft.category,
      startDateTime: start.toISOString(),
      endDateTime: end.toISOString(),
      providerId: this.draft.providerId.trim(),
      location: this.draft.location.trim(),
      notes: this.draft.notes.trim()
    };

    this.saving = true;
    this.service.publish(body)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving = false)
      )
      .subscribe({
        error: () => {
          this.formError = 'Publishing is unavailable: the backend has no slot endpoint yet. Your entries have been kept; nothing was saved.';
        }
      });
  }

  private emptyDraft(): AppointmentForm {
    return {
      title: '',
      category: 'Medical',
      start: '',
      end: '',
      providerId: '',
      location: '',
      notes: ''
    };
  }

  private localInput(value: string): string {
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

}
