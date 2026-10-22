/**
 * app.config.ts — the application-wide configuration passed to `bootstrapApplication`.
 *
 * Purpose: registers the services that every component may rely on: the router, the HTTP client,
 * and Angular's change-detection settings. Add a new global provider here (for example an HTTP
 * interceptor that attaches authentication tokens).
 *
 */

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Native cross-fade between pages (View Transitions API): the old page fades out while the
    // new one fades in, so there is no blank frame between routes. The first load is excluded so
    // the shell's own fade-in (AppComponent.routeVisible) handles it. Browsers without the API
    // fall back to that same opacity fade in AppComponent.
    provideRouter(routes, withViewTransitions({ skipInitialTransition: true })),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
