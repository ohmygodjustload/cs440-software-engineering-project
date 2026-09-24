/**
 * app.routes.ts — the URL-to-page map for the application.
 *
 * Purpose: states which page component is shown for which URL. This is the first file to edit when
 * a page is added or renamed.
 *
 */

import { Routes } from '@angular/router';

/**
 * Application routes. Each page is loaded lazily so the initial bundle only contains the shell
 * and the home page. Every route sets a page title, which Angular writes to the document.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'Home · BAAAM Scheduling System',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'calendar',
    title: 'Calendar · BAAAM Scheduling System',
    loadComponent: () =>
      import('./pages/calendar/calendar.component').then((m) => m.CalendarComponent)
  },
  {
    path: 'appointments',
    title: 'Appointments · BAAAM Scheduling System',
    loadComponent: () =>
      import('./pages/appointments/appointments.component').then((m) => m.AppointmentsComponent)
  },
  {
    path: 'statistics',
    title: 'Statistics · BAAAM Scheduling System',
    loadComponent: () =>
      import('./pages/statistics/statistics.component').then((m) => m.StatisticsComponent)
  },
  { path: '**', redirectTo: '' }
];
