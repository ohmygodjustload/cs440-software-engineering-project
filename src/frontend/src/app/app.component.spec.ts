/**
 * app.component.spec.ts — unit tests for AppComponent, the application shell.
 *
 * Purpose: guards the parts of the shell the rest of the team depends on — the application name in
 * the top bar, one navigation link per destination (in order), and the router outlet that pages are
 * rendered into. Adding a destination to the menu means updating this test as well.
 *
 */

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { ToastService } from './core/services/toast.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['clearToken', 'getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);
    toastService = jasmine.createSpyObj<ToastService>('ToastService', ['clear', 'showLoggedOut']);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose the application title', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance.title).toBe('BAAAM Scheduling System');
  });

  it('should render the application title in the top bar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const brand = fixture.nativeElement.querySelector('.app-brand') as HTMLElement | null;

    expect(brand?.textContent).toContain('BAAAM Scheduling System');
  });

  it('should render one navigation link per destination, in order', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.app-nav__link')
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Home',
      'Calendar',
      'Appointments',
      'Notifications',
      'Statistics',
      'Settings'
    ]);
  });

  it('should render the router outlet used by the routed pages', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('router-outlet')).not.toBeNull();
  });

  it('should render signed-in account initials and display name', () => {
    authService.getCurrentUser.and.returnValue({
      id: 'user-id',
      firstName: 'Jane',
      lastName: 'Porter',
      username: 'JanePorter123',
      isClient: true,
      isServiceProvider: false,
      isAdmin: false
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const account = fixture.nativeElement.querySelector('.app-account') as HTMLElement | null;

    expect(account?.textContent).toContain('JP');
    expect(account?.textContent).toContain('Jane Porter');
    expect(account?.textContent).toContain('Sign out');
  });

  it('should clear auth state when signing out', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.componentInstance.signOut();

    expect(authService.clearToken).toHaveBeenCalled();
  });

  it('should clear stale popups then show the logout popup when signing out', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const order: string[] = [];
    toastService.clear.and.callFake(() => {
      order.push('clear');
    });
    toastService.showLoggedOut.and.callFake(() => {
      order.push('showLoggedOut');
      return 'toast-1';
    });

    fixture.componentInstance.signOut();

    expect(toastService.clear).toHaveBeenCalled();
    expect(toastService.showLoggedOut).toHaveBeenCalled();
    expect(order).toEqual(['clear', 'showLoggedOut']);
  });
});
