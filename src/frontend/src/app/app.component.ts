/**
 * app.component.ts — AppComponent, the application shell.
 *
 * Purpose: provides the frame that every page is rendered inside: the top bar with the application
 * name, the navigation links, and the router outlet. Because it wraps all routes, it is also where
 * a global header, footer, or loading bar would go.
 *
 */

import { Component } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { User } from './core/models/user';
import { AuthService } from './core/services/auth.service';

/** A destination shown in the main navigation. */
interface NavLink {
  readonly label: string;
  readonly path: string;
}

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

  readonly title = 'BAAAM Scheduling System';

  readonly navLinks: readonly NavLink[] = [
    { label: 'Home', path: '/home' },
    { label: 'Calendar', path: '/calendar' },
    { label: 'Appointments', path: '/appointments' },
    { label: 'Notifications', path: '/notifications' },
    { label: 'Statistics', path: '/statistics' },
    { label: 'Settings', path: '/settings' }
  ];

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
