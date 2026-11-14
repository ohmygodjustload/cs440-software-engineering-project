import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { homeRoute } from '../routing/home-route';
import { AccountModesService } from '../services/account-modes.service';
import { AuthService } from '../services/auth.service';

/** Resolve normal Home URLs from persistent server roles, including an application approved since login. */
export const accountHomeGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const modes = inject(AccountModesService);
  const router = inject(Router);
  const currentPath = route.routeConfig?.path === 'home-provider' ? '/home-provider' : '/home';
  const result = (path: string) => path === currentPath ? true : router.createUrlTree([path]);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { reason: 'auth', returnUrl: state.url } });
  }
  const cached = auth.getCurrentUser();
  // Admins have their existing separate dashboard, not this self-service endpoint.
  if (cached?.isAdmin) return result('/home-admin');

  return modes.status().pipe(
    switchMap(({ user }) => {
      const sameRoles = cached?.id === user.id && cached.isClient === user.isClient &&
        cached.isServiceProvider === user.isServiceProvider && cached.isAdmin === user.isAdmin &&
        (cached.isActive !== false) === (user.isActive !== false);
      return sameRoles ? of(result(homeRoute(user))) : modes.refreshSession().pipe(
        map(response => result(homeRoute(response.user)))
      );
    }),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
        auth.clearToken();
        return of(router.createUrlTree(['/login'], { queryParams: { reason: 'auth', returnUrl: state.url } }));
      }
      // During an API outage retain the last authenticated role destination; role-protected APIs still authorize every operation.
      return of(result(homeRoute(auth.getCurrentUser())));
    })
  );
};
