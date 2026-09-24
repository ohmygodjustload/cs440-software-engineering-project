/**
 * app.config.ts — the application-wide configuration passed to `bootstrapApplication`.
 *
 * Purpose: registers the services that every component may rely on: the router, the HTTP client,
 * and Angular's change-detection settings. Add a new global provider here (for example an HTTP
 * interceptor that attaches authentication tokens).
 *
 */

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient()
  ]
};
