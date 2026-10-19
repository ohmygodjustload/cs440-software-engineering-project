/**
 * notification-popup.component.ts — global top-right notification popups.
 *
 * Purpose: renders the ToastService queue as stacked cards fixed to the top
 * right corner. Each card shows a dismiss X, a message, and a timer line at
 * the bottom that drains until auto-dismiss. Entry/exit is a smooth
 * slide-and-fade via CSS keyframes (no @angular/animations dependency).
 */

import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-notification-popup',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './notification-popup.component.html',
  styleUrl: './notification-popup.component.css'
})
export class NotificationPopupComponent {
  readonly toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
