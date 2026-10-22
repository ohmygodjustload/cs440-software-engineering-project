/**
 * calendar.component.ts — CalendarComponent, the page served at "/calendar".
 *
 * Purpose: renders the signed-in user's appointments in Month, Week, Day, or
 * Agenda layout. The initial view comes from the per-user default saved by the
 * Settings page (CalendarViewService, localStorage keyed by account id).
 * Switching views here is session-only and does not overwrite the saved
 * default; that stays an explicit Settings-page choice.
 */

import {CommonModule} from '@angular/common';
import {Component, DestroyRef, OnInit, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subject, catchError, of, switchMap, tap} from 'rxjs';
import {CalendarItem} from '../../core/models/calendar-item';
import {CALENDAR_VIEWS} from '../../core/models/user-settings';
import {AuthService} from '../../core/services/auth.service';
import {CalendarService} from '../../core/services/calendar.service';
import {CalendarViewId, CalendarViewService, DEFAULT_CALENDAR_VIEW} from '../../core/services/calendar-view.service';
import {LoadingComponent} from '../../core/components/loading/loading.component';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
}

@Component({
  selector: 'app-calendar',
  imports: [CommonModule, LoadingComponent],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})

export class CalendarComponent implements OnInit {
  private readonly service = inject(CalendarService);
  private readonly calendarViewService = inject(CalendarViewService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly monthChanges = new Subject<{ from: Date; to: Date }>();
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly views = CALENDAR_VIEWS;
  month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  days: CalendarDay[] = [];
  view: CalendarViewId = DEFAULT_CALENDAR_VIEW;
  loading = false;
  error = '';

  get monthLabel(): string {
    return this.month.toLocaleDateString('en-US', {month: 'long', year: 'numeric'});
  }

  /** Heading for the visible range: month, week span, or a single date. */
  get periodLabel(): string {
    if (this.view === 'day') {
      const day = this.days[0]?.date ?? this.month;
      return day.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'});
    }
    if (this.view === 'week') {
      const start = this.days[0]?.date ?? this.month;
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
      const startLabel = start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      const endLabel = end.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      return `${startLabel} – ${endLabel}`;
    }
    return this.monthLabel;
  }

  /** Agenda view: one flat, chronologically sorted list of the loaded items. */
  get agendaItems(): CalendarItem[] {
    return this.days
      .flatMap((day) => day.items)
      .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
  }

  /** Flat list for agenda (whole period) and day (single day) layouts. */
  get listItems(): CalendarItem[] {
    return this.view === 'day' ? (this.days[0]?.items ?? []) : this.agendaItems;
  }

  /** Empty-state copy for the flat agenda/day list. */
  get listEmptyMessage(): string {
    return this.view === 'day' ? 'No appointments on this day.' : 'No appointments in this period.';
  }

  get previousLabel(): string {
    return this.view === 'day' ? 'Previous day' : this.view === 'week' ? 'Previous week' : 'Previous month';
  }

  get nextLabel(): string {
    return this.view === 'day' ? 'Next day' : this.view === 'week' ? 'Next week' : 'Next month';
  }

  ngOnInit(): void {
    this.view = this.calendarViewService.getView(this.authService.getCurrentUser()?.id);
    if (this.view === 'week' || this.view === 'day') {
      // Saved default is a day-level view: land on today instead of the month's 1st.
      this.anchorToDay();
    }
    this.monthChanges.pipe(
      tap(() => {
        this.loading = true;
        this.error = '';
      }),
      switchMap(range => this.service.getItems(range.from, range.to).pipe(
        catchError(() => {
          this.error = 'Appointments could not be loaded. Please try again.';
          return of([]);
        })
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(items => {
      this.loading = false;
      for (const day of this.days) {
        const next = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate() + 1);
        day.items = items.filter(item => item.status !== 'Canceled' && item.status !== 'Available'
          && new Date(item.startDateTime) < next && new Date(item.endDateTime) > day.date)
          .sort((a, b) => Date.parse(a.startDateTime) - Date.parse(b.startDateTime));
      }
    });
    this.refresh();
  }

  previousMonth(): void {
    this.changePeriod(-1);
  }

  nextMonth(): void {
    this.changePeriod(1);
  }

  goToToday(): void {
    const now = new Date();
    this.month = this.view === 'month' || this.view === 'agenda'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    this.refresh();
  }

  /** Applies a different layout for this visit only (saved default unchanged). */
  setView(view: string): void {
    const match = this.views.find(option => option.value === view);
    if (!match || match.value === this.view) {
      return;
    }
    const previous = this.view;
    this.view = match.value as CalendarViewId;
    if (this.view === 'week' || this.view === 'day') {
      // Month/agenda leave `month` pinned to the 1st, so entering a day-level
      // view needs a real day anchor or the period shows no appointments.
      if (previous === 'month' || previous === 'agenda') {
        this.anchorToDay();
      }
    } else if (this.month.getDate() !== 1) {
      // Month/agenda always anchor on the 1st of the displayed month.
      this.month = new Date(this.month.getFullYear(), this.month.getMonth(), 1);
    }
    this.refresh();
  }

  /**
   * Anchors a day-level view on a real day: today when the displayed month is
   * the current one (where upcoming appointments live), otherwise the month's
   * 1st that month/agenda navigation leaves behind.
   */
  private anchorToDay(): void {
    const now = new Date();
    const showsCurrentMonth = this.month.getFullYear() === now.getFullYear()
      && this.month.getMonth() === now.getMonth();
    if (showsCurrentMonth) {
      this.month = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  /** Steps by the unit of the active view: day, week, or month. */
  private changePeriod(offset: number): void {
    if (this.view === 'day') {
      this.month = new Date(this.month.getFullYear(), this.month.getMonth(), this.month.getDate() + offset);
    } else if (this.view === 'week') {
      this.month = new Date(this.month.getFullYear(), this.month.getMonth(), this.month.getDate() + 7 * offset);
    } else {
      this.month = new Date(this.month.getFullYear(), this.month.getMonth() + offset, 1);
    }
    this.refresh();
  }

  refresh(): void {
    const year = this.month.getFullYear();
    const month = this.month.getMonth();
    // Day shows the selected day, week starts on its Sunday, and month/agenda
    // always build the grid from the 1st so round trips stay aligned.
    let from: Date;
    if (this.view === 'day') {
      from = new Date(year, month, this.month.getDate());
    } else if (this.view === 'week') {
      from = new Date(year, month, this.month.getDate() - this.month.getDay());
    } else {
      from = new Date(year, month, 1 - new Date(year, month, 1).getDay());
    }
    const count = this.visibleDayCount();
    const today = new Date().toDateString();
    this.days = Array.from({length: count}, (_, index) => {
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

  /** Week shows 7 cells and day shows 1; month and agenda fill the whole grid. */
  private visibleDayCount(): number {
    if (this.view === 'day') {
      return 1;
    }
    if (this.view === 'week') {
      return 7;
    }
    const year = this.month.getFullYear();
    const month = this.month.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    return Math.ceil((firstDayOfMonth.getDay() + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  }

}
