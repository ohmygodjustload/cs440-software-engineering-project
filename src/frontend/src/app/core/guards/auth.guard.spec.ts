import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { adminGuard, authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'isAuthenticated',
      'getCurrentUser'
    ]);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    });

    router = TestBed.inject(Router);
  });

  it('should allow protected routes when authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/home' } as never)
    );

    expect(result).toBeTrue();
  });

  it('should redirect protected routes to login when unauthenticated', () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/home' } as never)
    ) as UrlTree;

    expect(router.serializeUrl(result)).toContain('/login');
    expect(router.serializeUrl(result)).toContain('reason=auth');
  });

  it('should redirect guest routes to home when already authenticated', () => {
    authService.isAuthenticated.and.returnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as never, { url: '/login' } as never)
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/home');
  });

  it('should allow admin routes for signed-in admins', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: 'admin-1',
      firstName: 'Ada',
      lastName: 'Admin',
      username: 'AdaAdmin',
      isClient: false,
      isServiceProvider: false,
      isAdmin: true
    });

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/requests' } as never)
    );

    expect(result).toBeTrue();
  });

  it('should redirect non-admin users away from admin routes', () => {
    authService.isAuthenticated.and.returnValue(true);
    authService.getCurrentUser.and.returnValue({
      id: 'user-1',
      firstName: 'Jane',
      lastName: 'Porter',
      username: 'JanePorter123',
      isClient: true,
      isServiceProvider: false,
      isAdmin: false
    });

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/requests' } as never)
    ) as UrlTree;

    expect(router.serializeUrl(result)).toBe('/home');
  });

  it('should redirect unauthenticated users to login from admin routes', () => {
    authService.isAuthenticated.and.returnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as never, { url: '/home-admin' } as never)
    ) as UrlTree;

    expect(router.serializeUrl(result)).toContain('/login');
    expect(router.serializeUrl(result)).toContain('reason=auth');
  });
});
