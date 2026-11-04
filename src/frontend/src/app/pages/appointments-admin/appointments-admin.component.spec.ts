import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppointmentsAdminComponent } from './appointments-admin.component';

describe('AppointmentsAdminComponent', () => {
  let component: AppointmentsAdminComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppointmentsAdminComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    component = TestBed.createComponent(AppointmentsAdminComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads appointments and accounts, then filters appointments', () => {
    component.ngOnInit();
    http.expectOne('/api/admin/appointments').flush([
      {
        id: '1', title: 'Physical', category: 'Medical',
        startDateTime: '2026-10-30T10:00:00Z', endDateTime: '2026-10-30T11:00:00Z',
        providerId: 'p1', providerName: 'Priya Nair', userId: 'u1',
        location: 'Clinic', notes: null, status: 'Booked'
      },
      {
        id: '2', title: 'Yoga', category: 'Fitness',
        startDateTime: '2026-10-30T12:00:00Z', endDateTime: '2026-10-30T13:00:00Z',
        providerId: 'p2', providerName: 'Elena Rossi', userId: null,
        location: 'Studio', notes: null, status: 'Available'
      }
    ]);
    http.expectOne('/api/admin/accounts').flush([
      {
        id: 'u1', firstName: 'Alex', lastName: 'Client', username: 'alex',
        isClient: true, isServiceProvider: false, isAdmin: false
      }
    ]);

    expect(component.loading).toBeFalse();
    expect(component.filteredAppointments.length).toBe(2);
    component.searchForm.patchValue({ search: 'Nair' });
    expect(component.filteredAppointments.map(appointment => appointment.id)).toEqual(['1']);
    component.searchForm.patchValue({ search: '', appointmentType: 'Fitness' });
    expect(component.filteredAppointments.map(appointment => appointment.id)).toEqual(['2']);
  });
});
