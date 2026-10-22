/**
 * app.component.ts — AppComponent, the application shell.
 *
 * Purpose: provides the frame that every page is rendered inside: the top bar with the application
 * name, the navigation links, and the router outlet. Because it wraps all routes, it is also where
 * a global header, footer, or loading bar would go.
 *
 */

import { Component, DestroyRef, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
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
  { label: 'Create appointments', path: '/create-slots' },
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
  /**
   * Whether the routed page (and header) are visible. It starts hidden so opening the site fades
   * in, and it toggles around navigations only in browsers without the View Transitions API —
   * capable browsers cross-fade pages natively (see app.config.ts) and skip the manual fade.
   */
  routeVisible = false;

  /** Fade-out duration in milliseconds. Kept short so navigation never feels slowed down. */
  private readonly routeFadeMs = 180;

  /** Identifies the in-flight navigation so a stale timer cannot re-show a page mid-navigation. */
  private routeFadeToken = 0;

  /** Timestamp of the current navigation's NavigationStart, used to finish the fade-out. */
  private routeFadeStartedAt = 0;

  /** Pending reveal timer; replaced whenever a new navigation begins. */
  private routeRevealTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {
    // Guard redirects and lazy loading both surface as router events, so the shell listens to the
    // router instead of individual links to know when a page swap is happening.
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.beginRouteFade();
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError ||
        event instanceof NavigationSkipped
      ) {
        this.endRouteFade();
      }
    });
  }

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

  /**
   * Starts the fade-out as soon as a navigation begins (covers guards and redirects too).
   *
   * Browsers with the View Transitions API cross-fade the pages natively; fading the shell on top
   * of that would stack two transitions, so the manual fade is only used as a fallback there.
   */
  private beginRouteFade(): void {
    if (typeof document.startViewTransition === 'function') {
      return;
    }

    this.routeFadeToken += 1;
    this.routeFadeStartedAt = Date.now();
    this.routeVisible = false;

    if (this.routeRevealTimer !== null) {
      clearTimeout(this.routeRevealTimer);
      this.routeRevealTimer = null;
    }
  }

  /**
   * Reveals the page once the fade-out has finished (this also performs the initial fade-in on
   * first load, since routeVisible starts hidden). Waiting out the remaining fade time keeps the
   * content swap invisible instead of flashing the new page mid-fade; a one-frame buffer
   * guarantees the fade-out completes first.
   */
  private endRouteFade(): void {
    const token = this.routeFadeToken;
    const elapsedMs = Date.now() - this.routeFadeStartedAt;
    const remainingMs = Math.max(0, this.routeFadeMs - elapsedMs);

    if (this.routeRevealTimer !== null) {
      clearTimeout(this.routeRevealTimer);
    }

    this.routeRevealTimer = setTimeout(() => {
      this.routeRevealTimer = null;
      if (this.routeFadeToken === token) {
        this.routeVisible = true;
      }
    }, remainingMs + 16);
  }
}
