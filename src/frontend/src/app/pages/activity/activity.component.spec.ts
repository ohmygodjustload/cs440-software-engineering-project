import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityComponent } from './activity.component';

describe('ActivityComponent', () => {
  let fixture: ComponentFixture<ActivityComponent>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    fixture = TestBed.createComponent(ActivityComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads and filters activity entries', () => {
    http.expectOne('/api/admin/activity').flush([
      { id: '1', timestamp: '2026-10-30T10:00:00Z', action: 'Updated', message: 'Jane Porter', isRead: false },
      { id: '2', timestamp: '2026-10-30T11:00:00Z', action: 'Booked', message: 'Medical appointment', isRead: true }
    ]);
    const component = fixture.componentInstance;

    expect(component.entries.length).toBe(2);
    expect(component.filteredEntries.length).toBe(2);

    component.searchForm.controls.search.setValue('porter');

    expect(component.filteredEntries.length).toBe(1);
    expect(component.filteredEntries[0].id).toBe('1');
  });

  it('loads the appointment audit tab', () => {
    http.expectOne('/api/admin/activity').flush([]);
    const component = fixture.componentInstance;

    component.selectTab('audit');
    const request = http.expectOne((r) => r.url === '/api/admin/appointment-audit');
    request.flush([
      {
        id: '1',
        appointmentId: 'a1',
        appointmentTitle: 'Checkup',
        changedByUserId: 'u1',
        changedByName: 'Jane Porter',
        timestamp: '2026-10-30T10:00:00Z',
        action: 'CANCELLED',
        oldStatus: 'Booked',
        newStatus: 'Available'
      }
    ]);

    expect(component.activeTab).toBe('audit');
    expect(component.auditEntries.length).toBe(1);
    expect(component.statusLabel('Booked', 'Available')).toBe('Booked → Available');
  });

  it('paginates activity entries in groups of ten', () => {
    const entries = Array.from({ length: 21 }, (_, index) => ({
      id: `${index + 1}`,
      timestamp: '2026-10-30T10:00:00Z',
      action: 'Updated',
      message: `Account ${index + 1}`,
      isRead: true
    }));
    http.expectOne('/api/admin/activity').flush(entries);
    const component = fixture.componentInstance;

    expect(component.totalPages).toBe(3);
    expect(component.paginatedEntries.length).toBe(10);
    expect(component.paginatedEntries[0].id).toBe('1');

    component.selectPage(2);
    expect(component.paginatedEntries[0].id).toBe('11');
    expect(component.paginatedEntries.length).toBe(10);

    component.selectPage(3);
    expect(component.paginatedEntries[0].id).toBe('21');
    expect(component.paginatedEntries.length).toBe(1);
  });

  it('resets pagination when filtering activity', () => {
    const entries = Array.from({ length: 11 }, (_, index) => ({
      id: `${index + 1}`,
      timestamp: '2026-10-30T10:00:00Z',
      action: 'Updated',
      message: index === 10 ? 'Jane Porter' : `Account ${index + 1}`,
      isRead: true
    }));
    http.expectOne('/api/admin/activity').flush(entries);
    const component = fixture.componentInstance;
    component.selectPage(2);

    component.searchForm.controls.search.setValue('porter');

    expect(component.currentPage).toBe(1);
    expect(component.paginatedEntries.length).toBe(1);
  });
});
