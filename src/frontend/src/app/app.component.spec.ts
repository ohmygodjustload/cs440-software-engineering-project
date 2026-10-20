/**
 * app.component.spec.ts — unit tests for AppComponent, the application shell.
 *
 * Purpose: guards the parts of the shell the rest of the team depends on — the application name in
 * the top bar, one navigation link per destination (in order), and the router outlet that pages are
 * rendered into. Adding a destination to the menu means updating this test as well.
 *
 */

import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './core/services/auth.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['clearToken', 'getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
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

  it('should wrap the router outlet in the fading page container', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.app-route') as HTMLElement | null;

    expect(container).not.toBeNull();
    expect(container?.querySelector('router-outlet')).not.toBeNull();
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
});

/**
 * Pins `document.startViewTransition` to a known state so fade tests do not depend on the
 * browser running Karma. Returns a restore function for afterEach.
 */
function setViewTransitionsSupport(supported: boolean): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
  Object.defineProperty(document, 'startViewTransition', {
    value: supported ? () => ({}) : undefined,
    configurable: true,
    writable: true
  });
  return () => {
    if (descriptor) {
      Object.defineProperty(document, 'startViewTransition', descriptor);
    } else {
      delete (document as unknown as Record<string, unknown>)['startViewTransition'];
    }
  };
}

describe('AppComponent route fade (fallback without view transitions)', () => {
  @Component({ standalone: true, template: '<p>first page</p>' })
  class FirstPageComponent {}

  @Component({ standalone: true, template: '<p>second page</p>' })
  class SecondPageComponent {}

  let authService: jasmine.SpyObj<AuthService>;
  let restoreViewTransitions: () => void;

  beforeEach(async () => {
    restoreViewTransitions = setViewTransitionsSupport(false);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['clearToken', 'getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'first', component: FirstPageComponent },
          { path: 'second', component: SecondPageComponent }
        ]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
  });

  afterEach(() => restoreViewTransitions());

  it('should fade the page out while navigating and fade the new page back in', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const container = fixture.nativeElement.querySelector('.app-route') as HTMLElement;

    void router.navigateByUrl('/first');
    tick();
    fixture.detectChanges();

    // The page has swapped but the container is still faded out.
    expect(container.textContent).toContain('first page');
    expect(container.classList.contains('route-hidden')).toBeTrue();

    // After the short fade-out finishes the page is revealed again.
    tick(250);
    fixture.detectChanges();
    expect(container.classList.contains('route-hidden')).toBeFalse();

    void router.navigateByUrl('/second');
    tick();
    fixture.detectChanges();

    expect(container.textContent).toContain('second page');
    expect(container.classList.contains('route-hidden')).toBeTrue();

    tick(250);
    fixture.detectChanges();
    expect(container.classList.contains('route-hidden')).toBeFalse();
  }));
});

describe('AppComponent with native view transitions', () => {
  @Component({ standalone: true, template: '<p>first page</p>' })
  class FirstPageComponent {}

  @Component({ standalone: true, template: '<p>second page</p>' })
  class SecondPageComponent {}

  let authService: jasmine.SpyObj<AuthService>;
  let restoreViewTransitions: () => void;

  beforeEach(async () => {
    restoreViewTransitions = setViewTransitionsSupport(true);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['clearToken', 'getCurrentUser']);
    authService.getCurrentUser.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([
          { path: 'first', component: FirstPageComponent },
          { path: 'second', component: SecondPageComponent }
        ]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();
  });

  afterEach(() => restoreViewTransitions());

  it('should keep the page visible while navigating (the browser cross-fades instead)', fakeAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const container = fixture.nativeElement.querySelector('.app-route') as HTMLElement;

    void router.navigateByUrl('/first');
    tick(250);
    fixture.detectChanges();

    // The initial fade-in has completed and the manual fade never engaged.
    expect(container.classList.contains('route-hidden')).toBeFalse();

    void router.navigateByUrl('/second');
    tick();
    fixture.detectChanges();

    // The manual fade would hide the page here; with native view transitions it stays visible
    // so the browser can cross-fade the old and new page without a blank frame.
    expect(container.textContent).toContain('second page');
    expect(container.classList.contains('route-hidden')).toBeFalse();

    tick(250);
    fixture.detectChanges();
    expect(container.classList.contains('route-hidden')).toBeFalse();
  }));
});
