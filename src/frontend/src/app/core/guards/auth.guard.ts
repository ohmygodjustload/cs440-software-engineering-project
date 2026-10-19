import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], {
        queryParams: {
          reason: 'auth',
          returnUrl: state.url
        }
      });
};

/**
 * Restricts admin-only pages (home-admin, requests, review-request, accounts,
 * appointments-admin, confirmation) to signed-in admin accounts. Everyone else
 * is sent back to their own home page.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { reason: 'auth' }
    });
  }

  return authService.getCurrentUser()?.isAdmin
    ? true
    : router.createUrlTree([authService.getCurrentUser()?.isServiceProvider ? '/home-provider' : '/home']);
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getCurrentUser();
  const home = user?.isAdmin ? '/home-admin' : user?.isServiceProvider ? '/home-provider' : '/home';
  return authService.isAuthenticated() ? router.createUrlTree([home]) : true;
};
/** Allows the provider workspace only for active, signed-in provider accounts. */
export const providerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { reason: 'auth', returnUrl: state.url }
    });
  }
  const user = auth.getCurrentUser();
  return user?.isServiceProvider && user.isActive !== false
    ? true
    : router.createUrlTree([user?.isAdmin ? '/home-admin' : '/home']);
};
