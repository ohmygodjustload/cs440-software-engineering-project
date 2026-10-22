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
  private readonly slotsService = inject(SlotsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly categories: AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];

  category: AppointmentCategory | '' = '';
  slots: Slot[] = [];
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

  ngOnInit(): void {
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
          this.slots = slots;
          if (!slots.some((slot) => slot.id === this.selectedId)) this.selectedId = '';
        },
        error: () => this.loadError = 'Open slots could not be loaded. Check the API and retry.'
      });
  }

  choose(id: string): void {
    this.selectedId = id;
    this.formError = '';
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
}
