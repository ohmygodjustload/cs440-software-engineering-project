/**
 * notification-popup.component.spec.ts — unit tests for NotificationPopupComponent.
 *
 * Purpose: locks in the top-right popup UI contract — stacked cards, the
 * dismiss X per card, the timer line bound to each toast duration, and smooth
 * enter/exit classes.
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastService } from '../../core/services/toast.service';
import { NotificationPopupComponent } from './notification-popup.component';

describe('NotificationPopupComponent', () => {
  let fixture: ComponentFixture<NotificationPopupComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationPopupComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationPopupComponent);
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create with an empty top-right stack', () => {
    const root = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    expect(root.querySelector('.toast-stack')).not.toBeNull();
    expect(root.querySelectorAll('.toast').length).toBe(0);
  });

  it('should render the login greeting with an X and a timer line', () => {
    toastService.showLoggedIn();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const card = root.querySelector('.toast') as HTMLElement | null;

    expect(root.textContent).toContain(`You're Logged In!`);
    expect(card?.querySelector('.toast__close')?.getAttribute('aria-label')).toContain(`You're Logged In!`);
    expect(card?.querySelector('.toast__timer')).not.toBeNull();
  });

  it('should dismiss when the X is clicked', () => {
    const id = toastService.show({ title: 'Appointment booked' });
    fixture.detectChanges();

    const close = fixture.nativeElement.querySelector('.toast__close') as HTMLButtonElement;
    close.click();
    fixture.detectChanges();

    expect(toastService.toasts[0].id).toBe(id);
    expect(toastService.toasts[0].leaving).toBeTrue();
  });

  it('should stack missed notifications after the greeting', () => {
    toastService.showLoggedIn();
    toastService.showMissed('Appointment created', 'Annual physical');
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.toast');

    expect(cards.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain(`You're Logged In!`);
    expect(fixture.nativeElement.textContent).toContain('Appointment created');
  });
});
