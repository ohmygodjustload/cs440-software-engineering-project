/**
 * main.ts — the entry point of the Angular application.
 *
 * Purpose: this is the first file the browser executes (it is declared as the `browser` entry point
 * in angular.json). It starts up ("bootstraps") the app by handing Angular the root component and
 * the application-wide configuration, then renders that component into <app-root> in index.html.
 *
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
