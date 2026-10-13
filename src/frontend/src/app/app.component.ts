/**
 * app.component.ts — AppComponent, the application shell.
 *
 * Purpose: provides the frame that every page is rendered inside: the top bar with the application
 * name, the navigation links, and the router outlet. Because it wraps all routes, it is also where
 * a global header, footer, or loading bar would go.
 *
 */

import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { User } from './core/models/user';
import { UserSettingsService } from './core/services/user-settings.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/** A destination shown in the main navigation. */
interface NavLink {
  readonly label: string;
  readonly path: string;
}

const CLIENT_NAV: readonly NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Appointments', path: '/appointments' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Statistics', path: '/statistics' },
  { label: 'Settings', path: '/settings' }
];
const ADMIN_NAV: readonly NavLink[] = [
  { label: 'Home', path: '/home-admin' },
  { label: 'Requests', path: '/requests' },
  { label: 'Accounts', path: '/accounts' },
  { label: 'Appointments', path: '/appointments-admin' }
];
const PROVIDER_NAV: readonly NavLink[] = [
  { label: 'Home', path: '/' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Create Appointments', path: '/appointments' },
  { label: 'Notifications', path: '/notifications' },
  { label: 'Statistics', path: '/statistics' },
  { label: 'Settings', path: '/settings' }
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(private readonly router: Router) {}
  // private readonly router = inject(Router);
  private readonly settingsService = inject(UserSettingsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = 'BAAAM Scheduling System';

  get navLinks(): readonly NavLink[] {
    return ADMIN_NAV; // TODO: replace with dynamic nav based on user role
  }

  get usesFullPageLayout(): boolean {
    return ['/login', '/signup', '/signup/provider'].includes(
      this.router.url.split(/[?#]/)[0]
    );
    
  }
}
