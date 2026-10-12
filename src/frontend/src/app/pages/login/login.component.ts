import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';

type LoginAccountType = 'client' | 'serviceProvider';

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

  errorMessage: string | null = null;
  loading = false;
  passwordVisible = false;

  readonly form = this.formBuilder.nonNullable.group({
    accountType: ['client' as LoginAccountType, [Validators.required]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  get createAccountRoute(): string {
    return this.form.controls.accountType.value === 'serviceProvider'
      ? '/signup/provider'
      : '/signup';
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reason') === 'auth') {
      this.errorMessage = 'Please sign in first.';
    }
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
        next: () => {
          void this.router.navigateByUrl(this.route.snapshot.queryParamMap.get('returnUrl') ?? '/home');
        },
        error: (error: unknown) => {
          this.errorMessage = this.authService.getErrorMessage(error);
        }
      });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
}
