import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Appointment } from '../../core/models/appointment';
import { ProviderHomeService } from '../../core/services/home-provider.service';
import { SlotsService } from '../../core/services/slots.service';
import { ProviderHomeComponent } from './home-provider.component';

describe('ProviderHomeComponent', () => {
  const booked: Appointment = {
    id: 'b1',
    title: 'Checkup',
    category: 'Medical',
    startDateTime: new Date(Date.now() + 86400000).toISOString(),
    endDateTime: new Date(Date.now() + 90000000).toISOString(),
    providerId: 'p1',
    userId: 'c1',
    status: 'Booked'
  };

  function createComponent(slots: Partial<SlotsService> = {}) {
    TestBed.configureTestingModule({
      imports: [ProviderHomeComponent],
      providers: [
        provideRouter([]),
        { provide: ProviderHomeService, useValue: { bookings: () => of([booked]) } },
        {
          provide: SlotsService,
          useValue: {
            update: () => of(booked),
            delete: () => of(void 0),
            ...slots
          }
        }
      ]
    });
    return TestBed.createComponent(ProviderHomeComponent);
  }

  it('loads upcoming booked appointments', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.upcomingBooked.map((item) => item.id)).toEqual(['b1']);
  });

  it('opens the confirm dialog when update returns a booked-slot 409', () => {
    const update = jasmine.createSpy('update').and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              message: 'This slot is booked. Confirm to continue.',
              requiresConfirm: true,
              clientName: 'Jane Porter',
              startDateTime: booked.startDateTime
            }
          })
      )
    );
    const fixture = createComponent({ update });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const dialog = document.createElement('dialog');
    spyOn(dialog, 'showModal');
    component['confirmDialog'] = { nativeElement: dialog } as never;

    component.startEdit(booked);
    component.editStartLocal = component['toLocalInput'](new Date(Date.now() + 172800000).toISOString());
    component.saveEdit(booked);

    expect(update).toHaveBeenCalled();
    expect(component.pendingConflict?.clientName).toBe('Jane Porter');
    expect(component.pendingAction?.kind).toBe('update');
    expect(dialog.showModal).toHaveBeenCalled();
  });

  it('resends with confirm after the warning dialog', () => {
    const update = jasmine.createSpy('update').and.returnValue(of(booked));
    const fixture = createComponent({ update });
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.pendingAction = {
      kind: 'update',
      appointment: booked,
      startTime: new Date(Date.now() + 172800000).toISOString()
    };
    component.confirmPending();

    expect(update).toHaveBeenCalledWith(
      'b1',
      jasmine.objectContaining({ confirm: true })
    );
  });
});
