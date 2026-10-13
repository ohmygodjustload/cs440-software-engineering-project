import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAuthenticated']);

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
});
