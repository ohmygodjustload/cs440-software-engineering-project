import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

import { AppointmentCategory } from '../../core/models/appointment';
import { Slot } from '../../core/models/slot';
import { CreateSlotDraft, SlotsService } from '../../core/services/slots.service';
import { fieldErrorMessage } from '../../core/validation/field-error';

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
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  get categories(): readonly AppointmentCategory[] {
    const user = this.auth.getCurrentUser();
    if (!user?.isServiceProvider || user.isActive === false) return [];

    const allowed: AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];
    return allowed.filter(category => user.serviceTypes?.some(value =>
      value.trim().toLowerCase() === category.toLowerCase()));
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
  // Half-hour start times from 9:00 AM through 5:30 PM, inclusive (18 options).
  // Slots are 60 minutes, so the last slot ends at 6:30 PM. 18 options fill the
  // 3-column picker in six even rows. Generated from a range so gaps (like the
  // earlier missing noon hour) cannot sneak back in.
  readonly startTimes: readonly string[] = this.buildStartTimes(9, 17.5, 30);

  private buildStartTimes(startHour: number, endHour: number, stepMinutes: number): string[] {
    const pad = (n: number) => String(n).padStart(2, '0');
    const out: string[] = [];
    for (let m = startHour * 60; m <= endHour * 60; m += stepMinutes) {
      out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
    }
    return out;
  }

  draft = this.emptyDraft();
  existingSlots: Slot[] = [];
  saving = false;
  validationAttempted = false;
  formError = '';
  success = '';

  categoryChanged(): void {
    // Providers write their own titles; keep their text when changing category.
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
    if (!this.startTimes.includes(time) || this.isTimeUnavailable(time)) return;
    this.setStart(this.selectedDate, time);
  }

  isTimeUnavailable(time: string): boolean {
    return this.isPastTime(time) || this.overlapsExistingSlot(time);
  }

  fieldInvalid(control: NgModel | null): boolean {
    return fieldErrorMessage(control?.control ?? null, 'Field', this.validationAttempted) !== null;
  }

  requiredTextInvalid(control: NgModel | null, value: string): boolean {
    const shouldShow = control?.control.touched || this.validationAttempted;
    return (shouldShow && !value.trim()) || this.fieldInvalid(control);
  }

  timeInvalid(form: NgForm): boolean {
    return (form.submitted || this.validationAttempted) && !this.draft.start;
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

  ngOnInit(): void {
    // User ID and scheduler provider ID are different; do not substitute one for the other.
    this.draft.providerId = this.route.snapshot.data['providerId'] ?? '';
    this.providerChanged();
    this.loadExistingSlots();
  }

  save(form: NgForm): void {
    if (this.saving) return;
    this.validationAttempted = true;
    this.formError = '';
    this.success = '';
    if (this.draft.start && Number.isFinite(Date.parse(this.draft.start))) {
      this.draft.end = this.localInput(
        new Date(Date.parse(this.draft.start) + 60 * 60000).toISOString()
      );
    }
    const start = new Date(this.draft.start);
    const end = new Date(this.draft.end);

    if (form.invalid || !this.draft.title.trim() || !this.draft.location.trim() || !this.draft.start) {
      form.control.markAllAsTouched();
      this.formError = 'Fix the highlighted fields.';
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
        next: (slot) => {
          this.success = 'Your available slot has been published.';
          this.existingSlots = [...this.existingSlots, slot];
          this.validationAttempted = false;
          const category = this.draft.category;
          this.draft = this.emptyDraft();
          this.draft.category = category;
          form.resetForm(this.draft);
        },
        error: (error: unknown) => {
          this.formError = this.auth.getErrorMessage(error);
        }
      });
  }

  private loadExistingSlots(): void {
    this.service.getMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (slots) => this.existingSlots = slots,
        error: () => this.existingSlots = []
      });
  }

  private overlapsExistingSlot(time: string): boolean {
    const candidateStart = Date.parse(`${this.selectedDate}T${time}`);
    const candidateEnd = candidateStart + this.durationMinutes * 60000;
    return this.existingSlots.some((slot) => {
      const slotStart = Date.parse(slot.startDateTime);
      const slotEnd = Date.parse(slot.endDateTime);
      return candidateStart < slotEnd && candidateEnd > slotStart;
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
