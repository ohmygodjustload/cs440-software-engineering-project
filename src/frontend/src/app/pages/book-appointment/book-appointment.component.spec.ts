import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingService } from '../../core/services/booking.service';
import { BookAppointmentComponent } from './book-appointment.component';

describe('BookAppointmentComponent service selection', () => {
  it('filters services and clears a stale selection on category changes', () => {
    TestBed.configureTestingModule({
      imports: [BookAppointmentComponent],
      providers: [provideRouter([]), { provide: BookingService, useValue: {} }]
    });
    const component = TestBed.createComponent(BookAppointmentComponent).componentInstance;
    component.providers = [
      { id: 'doctor', name: 'Doctor', specialty: 'General' },
      { id: 'salon', name: 'Salon', specialty: 'Beauty' },
      { id: 'unknown', name: 'Unknown', specialty: 'Qualification text' }
    ];
    component.draft.providerId = 'doctor';
    component.draft.category = 'Medical';
    expect(component.filteredProviders.map((provider) => provider.id)).toEqual(['doctor']);
    component.draft.title = 'Physical';
    expect(component.serviceOptions).toContain('Physical');
    expect(component.serviceOptions).not.toContain('Haircut');

    component.draft.category = 'Beauty';
    component.categoryChanged();
    expect(component.draft.title).toBe('');
    expect(component.draft.providerId).toBe('');
    expect(component.filteredProviders.map((provider) => provider.id)).toEqual(['salon']);
    expect(component.serviceOptions).toContain('Haircut');
    expect(component.serviceOptions).not.toContain('Physical');
  });
});
