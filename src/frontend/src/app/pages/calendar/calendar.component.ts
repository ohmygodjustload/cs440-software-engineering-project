/**
 * calendar.component.ts — CalendarComponent, the page served at "/calendar".
 *
 * Purpose: placeholder screen for the calendar of upcoming appointments. It renders only
 * "<h1>Calendar Here!</h1>" so the shell and the routing can be verified end to end; the real
 * calendar arrives in a later ticket.
 *
 */

import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, of, switchMap, tap } from 'rxjs';
import { CalendarItem } from '../../core/models/calendar-item';
import { CalendarService } from '../../core/services/calendar.service';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})

export class CalendarComponent {
  private readonly service = inject(CalendarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly monthChanges = new Subject<{ from: Date; to: Date }>();
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  days: CalendarDay[] = [];
  loading = false;
  error = '';

  get monthLabel(): string {
    return this.month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  ngOnInit(): void {
    this.monthChanges.pipe(
      tap(() => { this.loading = true; this.error = ''; }),
      switchMap(range => this.service.getItems(range.from, range.to).pipe(
        catchError(() => { this.error = 'Appointments could not be loaded. Please try again.'; return of([]); })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => {
      this.loading = false;
      for (const day of this.days) {
        const next = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate() + 1);
        day.items = items.filter(item => item.status !== 'Cancelled'
          && new Date(item.startDateTime) < next && new Date(item.endDateTime) > day.date)
          .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
      }
    });
    this.refresh();
  }

  previousMonth(): void { 
    this.changeMonth(-1); 
  }

  nextMonth(): void { 
    this.changeMonth(1); 
  }

  goToToday(): void {
    const now = new Date();
    this.month = new Date(now.getFullYear(), now.getMonth(), 1);
    this.refresh();
  }

  private changeMonth(offset: number): void {
    this.month = new Date(this.month.getFullYear(), this.month.getMonth() + offset, 1);
    this.refresh();
  }

  refresh(): void {
    const year = this.month.getFullYear();
    const month = this.month.getMonth();
    const from = new Date(year, month, 1 - this.month.getDay());
    const count = Math.ceil((this.month.getDay() + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    const today = new Date().toDateString();
    this.days = Array.from({ length: count }, (_, index) => {
      const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + index);
      return { 
        date, 
        isCurrentMonth: date.getMonth() === month, 
        isToday: date.toDateString() === today, 
        items: [] 
      };
    });
    
    this.monthChanges.next({ 
      from, 
      to: new Date(from.getFullYear(), from.getMonth(), 
      from.getDate() + count) 
    });
  }

}
