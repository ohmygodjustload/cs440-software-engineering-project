import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { UserSettingsService } from '../../core/services/user-settings.service';

/** Max missed notifications replayed as popups after the login greeting. */
const MAX_MISSED_POPUPS = 3;

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);
  private readonly settingsService = inject(UserSettingsService);
  private readonly notificationsService = inject(NotificationsService);

  errorMessage: string | null = null;
  loading = false;
  passwordVisible = false;
  successMessage: string | null = null;

  readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  ngOnInit(): void {
    const reason = this.route.snapshot.queryParamMap.get('reason');

    if (reason === 'auth') {
      this.errorMessage = 'Please sign in first.';
    } else if (reason === 'registered') {
      this.successMessage = 'Account created. Sign in with your new credentials.';
    } else if (reason === 'provider-pending') {
      this.successMessage =
        'Service provider account submitted for admin approval. You can sign in once approved.';
    }
  }

  /**
   * True when sign-in failed because the provider's request was rejected. In that case we offer a
   * link to re-submit the application (the backend allows re-submission only after a rejection).
   */
  get showResubmit(): boolean {
    return !!this.errorMessage && this.errorMessage.includes('rejected by an admin');
  }

  onSubmit(): void {
    this.errorMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading = true;
    this.authService
      .login(
        {
          username: value.username,
          password: value.password
        },
        value.remember
      )
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          const home = response.user.isAdmin
            ? '/home-admin'
            : response.user.isServiceProvider
              ? '/home-provider'
              : '/home';
          this.greetAndReplayMissed();
          void this.router.navigateByUrl(returnUrl ?? home);
        },
        error: (error: unknown) => {
          this.errorMessage = this.authService.getErrorMessage(error);
        }
      });
  }

  /**
   * Shows "You're Logged In!" first, then replays up to MAX_MISSED_POPUPS
   * unread notifications (missed appointment + other notifications) as queued
   * popups. Read state is left untouched — the user marks items read on the
   * Notifications page. Failures are silent: the greeting still shows.
   */
  private greetAndReplayMissed(): void {
    this.toastService.showLoggedIn();
    this.settingsService.getCurrentUser().subscribe({
      next: (user) => {
        this.notificationsService.getPreferences(user.id).subscribe({
          next: (prefs) => {
            if (!prefs.inBrowserEnabled) {
              return;
            }
            this.notificationsService.getNotifications(user.id).subscribe({
              next: (items) => {
                items
                  .filter((item) => !item.isRead)
                  .sort(
                    (a, b) =>
                      Date.parse(a.createdAt) - Date.parse(b.createdAt)
                  )
                  .slice(0, MAX_MISSED_POPUPS)
                  .forEach((item, index) => {
                    window.setTimeout(() => {
                      this.toastService.showMissed(item.eventLabel, item.message);
                    }, (index + 1) * 1200);
                  });
              },
              error: () => undefined
            });
          },
          error: () => undefined
        });
      },
      error: () => undefined
    });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
}
