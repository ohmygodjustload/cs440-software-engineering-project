import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AppointmentCategory } from '../../core/models/appointment';
import { BookedAppointment, Slot } from '../../core/models/slot';
import { SlotsService } from '../../core/services/slots.service';
import { LoadingComponent } from '../../core/components/loading/loading.component';

interface ProviderOption {
  id: string;
  name: string;
  categories: AppointmentCategory[];
  openings: number;
}

/**
 * Client booking page: lists the open slots from `GET /api/slots`, lets the client pick one and add notes,
 * then books it with `POST /api/slots/{id}/book`. The API takes the client from the signed-in JWT.
 */
@Component({
  selector: 'app-book-appointment',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingComponent],
  templateUrl: './book-appointment.component.html',
  styleUrl: './book-appointment.component.css'
})
export class BookAppointmentComponent implements OnInit {
  private readonly dayMs = 24 * 60 * 60 * 1000;
  private readonly minWeekStart = this.startOfDay(new Date());
  private readonly slotsService = inject(SlotsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories: AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];

  category: AppointmentCategory | '' = '';
  slots: Slot[] = [];
  selectedProviderId = '';
  weekStart = this.startOfDay(new Date());
  selectedId = '';
  notes = '';
  loading = false;
  booking = false;
  loadError = '';
  formError = '';
  booked: BookedAppointment | null = null;

  get selected(): Slot | null {
    return this.slots.find((slot) => slot.id === this.selectedId) ?? null;
  }

  get providers(): ProviderOption[] {
    const providers = new Map<string, ProviderOption>();
    for (const slot of this.slots) {
      const provider: ProviderOption = providers.get(slot.providerId) ?? {
        id: slot.providerId,
        name: slot.providerName ?? 'Unknown provider',
        categories: [],
        openings: 0
      };
      provider.openings += 1;
      if (!provider.categories.includes(slot.category)) {
        provider.categories.push(slot.category);
      }
      providers.set(slot.providerId, provider);
    }

    return [...providers.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  get selectedProvider(): ProviderOption | null {
    return this.providers.find((provider) => provider.id === this.selectedProviderId) ?? null;
  }

  get providerSlots(): Slot[] {
    return this.selectedProviderId
      ? this.slots.filter((slot) => slot.providerId === this.selectedProviderId)
      : this.slots;
  }

  get visibleSlots(): Slot[] {
    const weekEnd = this.addDays(this.weekStart, 7);
    return this.providerSlots.filter((slot) => {
      const start = new Date(slot.startDateTime);
      return start >= this.weekStart && start < weekEnd;
    });
  }

  get weekRangeLabel(): string {
    return `${this.shortDate(this.weekStart)} - ${this.shortDate(this.addDays(this.weekStart, 6))}`;
  }

  get canGoPreviousWeek(): boolean {
    return this.addDays(this.weekStart, -7) >= this.minWeekStart;
  }

  ngOnInit(): void {
    this.loadSlots();
  }

  selectCategory(category: AppointmentCategory | ''): void {
    if (this.category === category || this.loading) {
      return;
    }

    this.category = category;
    this.selectedProviderId = '';
    this.selectedId = '';
    this.loadSlots();
  }

  loadSlots(): void {
    this.loading = true;
    this.loadError = '';

    this.slotsService.getAvailable(this.category ? { category: this.category } : {})
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (slots) => {
          this.slots = [...slots].sort((a, b) =>
            new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
          if (this.selectedProviderId && !this.providers.some((provider) => provider.id === this.selectedProviderId)) {
            this.selectedProviderId = '';
          }
          if (!slots.some((slot) => slot.id === this.selectedId)) this.selectedId = '';
          this.alignWeekToSlots();
        },
        error: () => this.loadError = 'Open slots could not be loaded. Check the API and retry.'
      });
  }

  chooseProvider(id: string): void {
    this.selectedProviderId = id;
    this.selectedId = '';
    this.formError = '';
    this.alignWeekToSlots();
  }

  chooseDifferentProvider(): void {
    this.selectedProviderId = '';
    this.selectedId = '';
    this.formError = '';
  }

  choose(id: string): void {
    this.selectedId = id;
    this.formError = '';
  }

  chooseDifferentDate(): void {
    this.selectedId = '';
    this.formError = '';
  }

  previousWeek(): void {
    if (!this.canGoPreviousWeek) {
      return;
    }

    this.moveWeek(-1);
  }

  nextWeek(): void {
    this.moveWeek(1);
  }

  book(): void {
    const slot = this.selected;
    if (!slot || this.booking) return;

    this.booking = true;
    this.formError = '';

    this.slotsService.book(slot.id, this.notes)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.booking = false)
      )
      .subscribe({
        next: (booked) => {
          this.booked = booked;
          this.notes = '';
          this.selectedId = '';
          this.selectedProviderId = '';
        },
        error: (error: unknown) => {
          this.formError = this.errorMessage(error);
          // The slot may have been taken or removed, so show the current list.
          if (error instanceof HttpErrorResponse && (error.status === 404 || error.status === 409)) {
            this.loadSlots();
          }
        }
      });
  }

  bookAnother(): void {
    this.booked = null;
    this.selectedProviderId = '';
    this.loadSlots();
  }

  private errorMessage(error: unknown): string {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    const body = error instanceof HttpErrorResponse && typeof error.error === 'string' ? error.error : '';
    switch (status) {
      case 401: return 'Please sign in to book an appointment.';
      case 403: return 'Only client accounts can book, and you cannot book your own slot.';
      case 404: return 'That slot is no longer available. Pick another time.';
      case 409: return body || 'That slot was just taken. Pick another time.';
      case 400: return body || 'That slot has already started. Pick another time.';
      default: return 'The appointment could not be booked. Check the API and try again.';
    }
  }

  private moveWeek(offset: number): void {
    this.weekStart = this.addDays(this.weekStart, offset * 7);
    if (!this.visibleSlots.some((slot) => slot.id === this.selectedId)) {
      this.selectedId = '';
    }
  }

  private alignWeekToSlots(): void {
    if (this.weekStart < this.minWeekStart) {
      this.weekStart = this.minWeekStart;
    }
  }

  private startOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private shortDate(date: Date): string {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
  }
}
