import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { homeRoute, isEnhancedUser } from '../routing/home-route';
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
    : router.createUrlTree([homeRoute(authService.getCurrentUser())]);};

/** Keeps the notification settings page available to clients and providers, not admins. */
export const nonAdminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { reason: 'auth' }
    });
  }

  return authService.getCurrentUser()?.isAdmin
    ? router.createUrlTree(['/home-admin'])
    : true;
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

/** Redirects /home to the dashboard belonging to the signed-in account. */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const destination = homeRoute(auth.getCurrentUser());
  return destination === '/home' ? true: router.createUrlTree([destination]);
};

  /** Both capabilities must already exist on the authentication account. */
export const enhancedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getCurrentUser();
  return isEnhancedUser(user) ? true : router.createUrlTree([homeRoute(user)]);
}
