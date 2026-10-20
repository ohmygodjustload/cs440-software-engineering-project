import { TestBed } from '@angular/core/testing';

import { CalendarViewService } from './calendar-view.service';

describe('CalendarViewService', () => {
  let service: CalendarViewService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarViewService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns the default view when nothing is saved', () => {
    expect(service.getView('user-1')).toBe('month');
  });

  it('round-trips a saved view per user id', () => {
    service.setView('user-1', 'week');
    service.setView('user-2', 'agenda');

    expect(service.getView('user-1')).toBe('week');
    expect(service.getView('user-2')).toBe('agenda');
  });

  it('falls back to the default for invalid stored values', () => {
    localStorage.setItem('baaam.calendar.view.user-1', 'lunar');

    expect(service.getView('user-1')).toBe('month');
  });

  it('ignores saves for a missing user id or unknown view', () => {
    service.setView(null, 'week');
    service.setView('user-1', 'lunar');

    expect(localStorage.length).toBe(0);
  });
});
