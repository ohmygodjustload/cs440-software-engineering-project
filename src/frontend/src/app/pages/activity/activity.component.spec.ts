import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivityComponent } from './activity.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

describe('ActivityComponent', () => {
  let component: ActivityComponent;
  let fixture: ComponentFixture<ActivityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ActivityComponent,
        ReactiveFormsModule,
        RouterModule.forRoot([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display loaders and populate data on init', fakeAsync(() => {
    component.ngOnInit();
    expect(component.loading).toBeTrue();

    tick(600); // Account for simulated API delay
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(component.appointments.length).toBe(4);
    expect(component.filteredAppointments.length).toBe(4);
  }));

  it('should filter appointments by search string match', fakeAsync(() => {
    component.ngOnInit();
    tick(600);
    fixture.detectChanges();

    component.searchForm.patchValue({ search: 'Nair' });
    fixture.detectChanges();

    expect(component.filteredAppointments.length).toBe(1);
    expect(component.filteredAppointments[0].providerName).toBe('Priya Nair');
  }));

  it('should filter appointments by type selection match', fakeAsync(() => {
    component.ngOnInit();
    tick(600);
    fixture.detectChanges();

    component.searchForm.patchValue({ appointmentType: 'client' });
    fixture.detectChanges();

    expect(component.filteredAppointments.length).toBe(1);
    expect(component.filteredAppointments[0].appointmentTypeId).toBe('Client');
  }));

  it('should log edit messages on clicking edit action', () => {
    spyOn(console, 'log');
    const mockApp = {
      providerId: 'Elena Rossi',
      category: 'Medical',
      appointmentTypeId: 'Client',
      username: 'elena.rossi',
      email: 'elena.rossi@email.com'
    };

    // component.editAppointment(mockApp);
    expect(console.log).toHaveBeenCalledWith('Editing appointment for:', 'Elena Rossi');
  });
});
