/**
 * loading.component.ts — a small animated "loading" indicator (spinner + status text).
 *
 * Purpose: replaces plain "Loading …" text with a visual cue so slow pages (settings,
 * appointments, notifications, …) show that work is happening instead of appearing to jump
 * straight to content. The label keeps the same wording as the old text-only messages and is
 * announced through the host's role="status", so screen-reader behaviour is unchanged.
 *
 */

import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  host: { role: 'status' },
  templateUrl: './loading.component.html',
  styleUrl: './loading.component.css'
})
export class LoadingComponent {
  /** Status text shown next to the spinner, e.g. "Loading appointments…". */
  @Input({ required: true }) label: string = '';
}
