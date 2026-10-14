import { Component, OnInit, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceCredentialRequest, ServiceType } from '../../core/models/auth';
import { AuthService } from '../../core/services/auth.service';
import { fieldErrorMessage } from '../../core/validation/field-error';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  return password && confirmPassword && password !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
}

function serviceTypeValidator(control: AbstractControl): ValidationErrors | null {
  const services = control.get('services');
  const selected =
    services?.get('medical')?.value ||
    services?.get('beauty')?.value ||
    services?.get('fitness')?.value;

  return selected ? null : { serviceTypeRequired: true };
}

@Component({
  selector: 'app-signup-provider',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup-provider.component.html',
  styleUrl: '../signup/signup.component.css'
})
export class SignupProviderComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  confirmPasswordVisible = false;
  errorMessage: string | null = null;
  loading = false;
  passwordVisible = false;
  successMessage: string | null = null;
  /** True when reached with ?mode=resubmit, i.e. re-applying after a rejection. */
  isResubmit = false;
  private successTimer: any = null;

  readonly form = this.formBuilder.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(100)]],
      lastName: ['', [Validators.required, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
      phone: ['', [Validators.required, Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      services: this.formBuilder.nonNullable.group({
        medical: [false],
        beauty: [false],
        fitness: [false]
      }),
      medicalCredentials: this.formBuilder.nonNullable.group({
        info: ['']
      }),
      beautyCredentials: this.formBuilder.nonNullable.group({
        info: ['']
      }),
      fitnessCredentials: this.formBuilder.nonNullable.group({
        info: ['']
      })
    },
    { validators: [passwordsMatchValidator, serviceTypeValidator] }
  );

  get hasPasswordMismatch(): boolean {
    return this.form.hasError('passwordsMismatch') && this.form.controls.confirmPassword.touched;
  }

  get hasServiceTypeError(): boolean {
    return this.form.hasError('serviceTypeRequired') && this.form.controls.services.touched;
  }

  get medicalSelected(): boolean {
    return this.form.controls.services.controls.medical.value;
  }

  get beautySelected(): boolean {
    return this.form.controls.services.controls.beauty.value;
  }

  get fitnessSelected(): boolean {
    return this.form.controls.services.controls.fitness.value;
  }

  /** Heading shown above the form; differs when re-applying after a rejection. */
  get titleText(): string {
    return this.isResubmit
      ? 'Re-submit Your Service Provider Application'
      : 'Create a Service Provider Account';
  }

  /** Helper line under the heading. */
  get ledeText(): string {
    return this.isResubmit
      ? 'Update your details and re-submit. Your request will be reviewed again by an admin.'
      : 'Service provider accounts are subject to admin approval.';
  }

  /** Submit button label. */
  get submitLabel(): string {
    return this.isResubmit ? 'Re-submit for approval' : 'Submit for approval';
  }

  /** Inline validation message for a field, or null when it is untouched or valid. */
  fieldError(controlName: string, label: string): string | null {
    return fieldErrorMessage(this.form.get(controlName), label);
  }

  ngOnInit(): void {
    this.isResubmit = this.route.snapshot.queryParamMap.get('mode') === 'resubmit';
  }

  onSubmit(): void {
    this.errorMessage = null;
    this.successMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const payload = {
      firstName: value.firstName,
      lastName: value.lastName,
      username: value.username,
      email: this.normalizeOptional(value.email),
      phone: this.normalizeOptional(value.phone),
      password: value.password,
      serviceTypes: this.toServiceTypes(value.services),
      medicalCredentials: value.services.medical
        ? this.toCredential({ info: value.medicalCredentials.info })
        : null,
      beautyCredentials: value.services.beauty
        ? this.toCredential({ info: value.beautyCredentials.info })
        : null,
      fitnessCredentials: value.services.fitness
        ? this.toCredential({ info: value.fitnessCredentials.info })
        : null
    };

    this.loading = true;
    const request = this.isResubmit
      ? this.authService.resubmitProvider(payload)
      : this.authService.registerProvider(payload);
    request
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.loading = false;
          this.successMessage = this.isResubmit
            ? 'Your updated request has been re-submitted for approval. Please check back soon for the status of your request.'
            : 'Your request has been submitted for approval. Please check back soon for the status of your request.';
          setTimeout(() => this.goToLogin(), 3000);
        },
        error: (error: unknown) => {
          this.errorMessage = this.authService.getErrorMessage(error);
        }
      });
  }

  goToLogin(): void {
    clearTimeout(this.successTimer);
    this.successTimer = null;
    void this.router.navigate(['/login'], { queryParams: { reason: 'provider-pending' } });
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }

  private toServiceTypes(services: { medical: boolean; beauty: boolean; fitness: boolean }): ServiceType[] {
    const selected: ServiceType[] = [];
    if (services.medical) {
      selected.push('Medical');
    }
    if (services.beauty) {
      selected.push('Beauty');
    }
    if (services.fitness) {
      selected.push('Fitness');
    }
    return selected;
  }

  private toCredential(credential: ServiceCredentialRequest): ServiceCredentialRequest {
    return {
      info: this.normalizeOptional(credential.info ?? '')
    };
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
