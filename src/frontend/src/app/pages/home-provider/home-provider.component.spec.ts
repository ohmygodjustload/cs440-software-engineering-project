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

  it('hides Edit and Cancel booking while a booked row is being edited', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const native: HTMLElement = fixture.nativeElement;
    expect(native.querySelector('a[href="/provider"]')).toBeNull();

    component.startEdit(booked);
    fixture.detectChanges();

    const card = Array.from(native.querySelectorAll('.appointment-card')).find((el) =>
      el.textContent?.includes('Checkup')
    ) as HTMLElement;
    const labels = Array.from(card.querySelectorAll('button')).map((btn) => btn.textContent?.trim());

    expect(labels).toContain('Save');
    expect(labels).not.toContain('Edit');
    expect(labels).not.toContain('Cancel booking');
    expect(labels.some((label) => label?.startsWith('View details'))).toBeFalse();
  });

  it('toggles details under the Upcoming booked row', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    const native: HTMLElement = fixture.nativeElement;
    const section = Array.from(native.querySelectorAll('section')).find((el) =>
      el.querySelector('h2')?.textContent?.includes('Upcoming booked')
    ) as HTMLElement;
    const card = section.querySelector('.appointment-card') as HTMLElement;
    const toggle = Array.from(card.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('View details')
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();

    expect(toggle.textContent).toContain('Hide details');
    expect(card.nextElementSibling?.classList.contains('details')).toBeTrue();
    expect(component.detailsOpen('booked:b1')).toBeTrue();
    expect(component.detailsOpen('next:b1')).toBeFalse();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.textContent).toContain('View details');
    expect(card.nextElementSibling?.classList.contains('details')).toBeFalsy();
  });

  it('opens only the section that was clicked for the same appointment', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleDetails('next:b1');
    fixture.detectChanges();

    expect(component.detailsOpen('next:b1')).toBeTrue();
    expect(component.detailsOpen('booked:b1')).toBeFalse();

    const native: HTMLElement = fixture.nativeElement;
    const nextSection = Array.from(native.querySelectorAll('section')).find((el) =>
      el.querySelector('h2')?.textContent?.includes('Next appointment')
    ) as HTMLElement;
    expect(nextSection.querySelector('.details')).not.toBeNull();

    const bookedSection = Array.from(native.querySelectorAll('section')).find((el) =>
      el.querySelector('h2')?.textContent?.includes('Upcoming booked')
    ) as HTMLElement;
    expect(bookedSection.querySelector('.details')).toBeNull();
  });

  it('closes a previously open row when another section opens', () => {
    const recent: Appointment = {
      id: 'r1',
      title: 'Past checkup',
      category: 'Medical',
      startDateTime: new Date(Date.now() - 172800000).toISOString(),
      endDateTime: new Date(Date.now() - 169200000).toISOString(),
      providerId: 'p1',
      userId: 'c1',
      status: 'Completed'
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProviderHomeComponent],
      providers: [
        provideRouter([]),
        { provide: ProviderHomeService, useValue: { bookings: () => of([booked, recent]) } },
        {
          provide: SlotsService,
          useValue: {
            update: () => of(booked),
            delete: () => of(void 0)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ProviderHomeComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggleDetails('booked:b1');
    fixture.detectChanges();
    expect(component.detailsOpen('booked:b1')).toBeTrue();

    component.toggleDetails('recent:r1');
    fixture.detectChanges();

    expect(component.detailsOpen('booked:b1')).toBeFalse();
    expect(component.detailsOpen('recent:r1')).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.details').length).toBe(1);
  });

  it('hides Edit and Delete while an open slot is being edited', () => {
    const openSlot: Appointment = {
      id: 's1',
      title: 'Open massage',
      category: 'Beauty',
      startDateTime: new Date(Date.now() + 172800000).toISOString(),
      endDateTime: new Date(Date.now() + 176400000).toISOString(),
      providerId: 'p1',
      userId: null,
      status: 'Available'
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProviderHomeComponent],
      providers: [
        provideRouter([]),
        { provide: ProviderHomeService, useValue: { bookings: () => of([booked, openSlot]) } },
        {
          provide: SlotsService,
          useValue: {
            update: () => of(openSlot),
            delete: () => of(void 0)
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ProviderHomeComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.showAvailability = true;
    component.startEdit(openSlot);
    fixture.detectChanges();

    const row = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.open-slot')
    ).find((el) => el.textContent?.includes('Open massage')) as HTMLElement;
    const labels = Array.from(row.querySelectorAll('button')).map((btn) => btn.textContent?.trim());

    expect(labels).toContain('Save');
    expect(labels).not.toContain('Edit');
    expect(labels).not.toContain('Delete');
  });
});
