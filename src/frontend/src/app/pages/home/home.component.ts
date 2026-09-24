/**
 * home.component.ts — HomeComponent, the landing page served at "/".
 *
 * Purpose: placeholder screen for the home dashboard. It renders only "<h1>Home Here!</h1>" so the
 * shell and routing can be verified end to end; the real dashboard arrives in a later ticket.
 *
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {}
