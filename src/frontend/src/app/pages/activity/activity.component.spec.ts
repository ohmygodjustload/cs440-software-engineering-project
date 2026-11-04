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
      { id: '1', timestamp: '2026-10-30T10:00:00Z', action: 'Updated', message: 'Jane Porter' },
      { id: '2', timestamp: '2026-10-30T11:00:00Z', action: 'Booked', message: 'Medical appointment' }
    ]);
    const component = fixture.componentInstance;

    expect(component.entries.length).toBe(2);
    expect(component.filteredEntries.length).toBe(2);

    component.searchForm.controls.search.setValue('porter');

    expect(component.filteredEntries.length).toBe(1);
    expect(component.filteredEntries[0].id).toBe('1');
  });

  it('clears activity after confirmation', () => {
    http.expectOne('/api/admin/activity').flush([
      { id: '1', timestamp: '2026-10-30T10:00:00Z', action: 'Updated', message: 'Jane Porter' }
    ]);
    spyOn(window, 'confirm').and.returnValue(true);

    fixture.componentInstance.clearActivity();

    const request = http.expectOne('/api/admin/activity');
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    expect(fixture.componentInstance.entries).toEqual([]);
    expect(fixture.componentInstance.filteredEntries).toEqual([]);
  });
});
