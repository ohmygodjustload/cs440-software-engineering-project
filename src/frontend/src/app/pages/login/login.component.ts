import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { User } from '../../core/models/user';

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
          void this.router.navigateByUrl(this.resolvePostLoginTarget(returnUrl, response.user, home));
        },
        error: (error: unknown) => {
          this.errorMessage = this.authService.getErrorMessage(error);
        }
      });
  }

  /**
   * Shows "You're Logged In!" first, then if there are unread notifications,
   * shows a single toast telling the user to visit the Notifications tab.
   * Read state is left untouched — the user marks items read on the
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
                const unreadCount = items.filter((item) => !item.isRead).length;
                if (unreadCount > 0) {
                  window.setTimeout(() => {
                    this.toastService.show({
                      title: 'Unread notifications',
                      message: `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}. Visit the Notifications tab to read them.`,
                      variant: 'info'
                    });
                  }, 1200);
                }
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

  /**
   * Picks the post-login destination, preferring a stored returnUrl only when
   * it is safe and role-appropriate. Ignored cases fall back to the
   * role-based home so a stale `?returnUrl=/home` can never misroute a
   * first-time provider (or admin) to the client home.
   */
  private resolvePostLoginTarget(returnUrl: string | null, user: User, home: string): string {
    if (!returnUrl || !returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return home;
    }

    const path = returnUrl.split(/[?#]/)[0].toLowerCase();
    // Default/empty route ('' -> '/home') is captured before the role is known.
    if (path === '/' || path === '/home') {
      return home;
    }
    if (path === '/home-admin') {
      return user.isAdmin ? returnUrl : home;
    }
    if (path === '/home-provider') {
      return user.isServiceProvider && !user.isAdmin ? returnUrl : home;
    }
    return returnUrl;
  }
}
