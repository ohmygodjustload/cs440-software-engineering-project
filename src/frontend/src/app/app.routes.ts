/**
 * app.routes.ts — the URL-to-page map for the application.
 *
 * Purpose: states which page component is shown for which URL. This is the first file to edit when
 * a page is added or renamed.
 *
 */

import { Routes } from '@angular/router';

import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

/**
 * Application routes. Each page is loaded lazily so the initial bundle only contains the shell
 * and the home page. Every route sets a page title, which Angular writes to the document.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in · BAAAM Scheduling System',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'signup',
    title: 'Create account · BAAAM Scheduling System',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/signup-selection/signup-selection.component').then(
        (m) => m.SignupSelectionComponent
      )
  },
  {
    path: 'signup/user',
    title: 'Create user account · BAAAM Scheduling System',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/signup/signup.component').then((m) => m.SignupComponent)
  },
  {
    path: 'signup/provider',
    title: 'Create service provider account · BAAAM Scheduling System',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/signup-provider/signup-provider.component').then(
        (m) => m.SignupProviderComponent
      )
  },
  {
    path: 'home',
    title: 'Home · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'home-admin',
    title: 'Home · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/home-admin/home-admin.component').then((m) => m.HomeAdminComponent)
  },
  {
    path: 'requests',
    title: 'Requests · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/requests/requests.component').then((m) => m.RequestsComponent)
  },
  {
    path: 'review-request',
    title: 'Review Request · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/review-request/review-request.component').then((m) => m.ReviewRequestComponent)
  },
  {
    path: 'confirmation',
    title: 'Confirmation · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/confirmation/confirmation.component').then((m) => m.ConfirmationPromptComponent)
  },
  {
    path: 'calendar',
    title: 'Calendar · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/calendar/calendar.component').then((m) => m.CalendarComponent)
  },
  {
    path: 'appointments',
    title: 'Appointments · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/appointments/appointments.component').then((m) => m.AppointmentsComponent)
  },
  {
    path: 'accounts',
    title: 'Accounts · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/accounts/accounts.component').then((m) => m.AccountsComponent)
  },
  {
    path: 'appointments-admin',
    title: 'Appointments · BAAAM Scheduling System',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/appointments-admin/appointments-admin.component').then((m) => m.AppointmentsAdminComponent)
  },
  {
    path: 'notifications',
    title: 'Notifications · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/notifications/notifications.component')
        .then(m => m.NotificationsComponent)
  },
  {
    path: 'statistics',
    title: 'Statistics · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/statistics/statistics.component').then((m) => m.StatisticsComponent)
  },
  {
    path: 'settings',
    title: 'Settings · BAAAM Scheduling System',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/settings/settings.component')
        .then(m => m.SettingsComponent)
  },
  {
    path: 'book-appointment',
    title: 'Book appointment · BAAAM',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/book-appointment/book-appointment.component')
        .then((m) => m.BookAppointmentComponent)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  },
];
