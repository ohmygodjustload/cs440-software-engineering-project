/**
 * statistics.component.spec.ts — unit tests for StatisticsComponent.
 *
 * Purpose: locks in the two things this page must do while it is a placeholder — construct, and
 * render the text "Statistics Here!". Rewrite these expectations alongside the real panel.
 *
 */


import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { Appointment } from '../../core/models/appointment';
import { StatisticsService } from '../../core/services/statistics.service';
import { StatisticsComponent } from './statistics.component';

describe('StatisticsComponent', () => {
  let service: jasmine.SpyObj<StatisticsService>;
  const now = new Date(2026, 9, 18, 12);
  function appointment(id: string, status: Appointment['status'], daysAgo = 1): Appointment {
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(9, 0, 0, 0);
    return { id, title: 'Checkup', category: 'Medical', status,
      startDateTime: start.toISOString(), endDateTime: new Date(+start + 3600000).toISOString(),
      userId: 'client-1', providerId: 'provider-1' };
  }
  function create() {
    TestBed.configureTestingModule({
      imports: [StatisticsComponent],
      providers: [{ provide: StatisticsService, useValue: service }]
    });
    const fixture = TestBed.createComponent(StatisticsComponent);
    fixture.detectChanges();
    return fixture;
  }
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(now);
    service = jasmine.createSpyObj<StatisticsService>('StatisticsService', ['loadAppointments']);
    service.loadAppointments.and.returnValue(of([]));
  });
  afterEach(() => jasmine.clock().uninstall());

  it('renders the real heading and empty state', () => {
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Scheduling statistics');
    expect(fixture.nativeElement.textContent).toContain('No completed appointments');
  });
  it('counts Canceled and Completed separately and charts only completed history', () => {
    service.loadAppointments.and.returnValue(of([
      appointment('done', 'Completed'), appointment('cancel', 'Canceled'), appointment('booked', 'Booked')
    ]));
    const fixture = create();
    const component = fixture.componentInstance;
    expect(component.completed.length).toBe(1);
    expect(component.cancelledCount).toBe(1);
    expect(component.categories.find(row => row.label === 'Medical')?.count).toBe(1);
    expect(component.times.find(row => row.label === 'Morning')?.count).toBe(1);
    expect(fixture.nativeElement.querySelector('.cancelled p').textContent.trim()).toBe('1');
  });
  it('excludes future and out-of-range appointments and updates the selected range', () => {
    service.loadAppointments.and.returnValue(of([
      appointment('recent', 'Completed', 1), appointment('older', 'Completed', 40),
      appointment('expired', 'Completed', 100), appointment('future', 'Completed', -1)
    ]));
    const component = create().componentInstance;
    expect(component.completed.length).toBe(2);
    component.rangeDays = 30;
    expect(component.completed.map(item => item.id)).toEqual(['recent']);
    expect(component.percentage(0, [{ label: 'Empty', count: 0 }])).toBe(0);
  });
  it('shows loading, prevents duplicate refreshes, then renders the response', () => {
    const response = new Subject<Appointment[]>();
    service.loadAppointments.and.returnValue(response);
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Loading statistics');
    fixture.componentInstance.load();
    expect(service.loadAppointments).toHaveBeenCalledTimes(1);
    response.next([]);
    response.complete();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading).toBeFalse();
  });
  it('shows a loading failure and allows retry', () => {
    service.loadAppointments.and.returnValue(throwError(() => new Error('Please sign in to view statistics.')));
    const fixture = create();
    expect(fixture.nativeElement.textContent).toContain('Please sign in');
    service.loadAppointments.and.returnValue(of([]));
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.componentInstance.error).toBe('');
    expect(fixture.nativeElement.textContent).toContain('No completed appointments');
  });
});
