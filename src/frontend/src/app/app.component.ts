/**
 * app.component.ts — AppComponent, the application shell.
 *
 * Purpose: provides the frame that every page is rendered inside: the top bar with the application
 * name, the navigation links, and the router outlet. Because it wraps all routes, it is also where
 * a global header, footer, or loading bar would go.
 *
 */

import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

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
  readonly title = 'BAAAM Scheduling System';

  readonly navLinks: readonly NavLink[] = [
    { label: 'Home', path: '/' },
    { label: 'Calendar', path: '/calendar' },
    { label: 'Appointments', path: '/appointments' },
    { label: 'Statistics', path: '/statistics' }
  ];
}
