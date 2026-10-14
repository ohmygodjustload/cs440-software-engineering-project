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
import { AuthService } from './core/services/auth.service';

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
  { label: 'Home', path: '/home-provider' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Notification', path: '/notifications' },
  { label: 'Settings', path: '/settings' },
  { label: 'Stats', path: '/statistics' }
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  get title(): string {
    return this.signedInUser?.isServiceProvider && !this.signedInUser?.isAdmin
      ? 'BAAAM / PROVIDER'
      : 'BAAAM Scheduling System';
  }

  get isProviderWorkspace(): boolean {
    return !!this.signedInUser?.isServiceProvider && !this.signedInUser?.isAdmin;
  }

  /** Role-aware navigation: the admin, provider, and client menus differ per app.routes.ts. */
  get navLinks(): readonly NavLink[] {
    const user = this.signedInUser;

    if (user?.isAdmin) {
      return ADMIN_NAV;
    }

    if (user?.isServiceProvider) {
      return PROVIDER_NAV;
    }

    return CLIENT_NAV;
  }

  get usesFullPageLayout(): boolean {
    return ['/login', '/signup', '/signup/user', '/signup/provider'].includes(
      this.router.url.split(/[?#]/)[0]
    );
  }

  get signedInUser(): User | null {
    return this.authService.getCurrentUser();
  }

  get accountDisplayName(): string {
    const user = this.signedInUser;
    if (!user) {
      return '';
    }

    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return fullName || user.username;
  }

  get accountInitials(): string {
    const user = this.signedInUser;
    if (!user) {
      return '';
    }

    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';
    const initials = `${first}${last}`.trim();
    return (initials || user.username.slice(0, 2)).toUpperCase();
  }

  signOut(): void {
    this.authService.clearToken();
    void this.router.navigateByUrl('/login');
  }
}
