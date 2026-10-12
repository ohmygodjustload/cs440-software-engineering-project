import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ServiceCredentialRequest, ServiceType } from '../../core/models/auth';
import { AuthService } from '../../core/services/auth.service';

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
export class SignupProviderComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  confirmPasswordVisible = false;
  errorMessage: string | null = null;
  loading = false;
  passwordVisible = false;
  submitMessage: string | null = null;

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
        qualification: [''],
        school: [''],
        licenseNumber: ['']
      }),
      beautyCredentials: this.formBuilder.nonNullable.group({
        certification: [''],
        licenseNumber: [''],
        specialties: ['']
      }),
      fitnessCredentials: this.formBuilder.nonNullable.group({
        certification: [''],
        certificationNumber: [''],
        specialties: ['']
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

  onSubmit(): void {
    this.errorMessage = null;
    this.submitMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.loading = true;
    this.authService
      .registerProvider({
        firstName: value.firstName,
        lastName: value.lastName,
        username: value.username,
        email: this.normalizeOptional(value.email),
        phone: this.normalizeOptional(value.phone),
        password: value.password,
        serviceTypes: this.toServiceTypes(value.services),
        medicalCredentials: value.services.medical
          ? this.toCredential({
              qualification: value.medicalCredentials.qualification,
              institution: value.medicalCredentials.school,
              licenseNumber: value.medicalCredentials.licenseNumber
            })
          : null,
        beautyCredentials: value.services.beauty
          ? this.toCredential({
              qualification: value.beautyCredentials.certification,
              licenseNumber: value.beautyCredentials.licenseNumber,
              specialties: value.beautyCredentials.specialties
            })
          : null,
        fitnessCredentials: value.services.fitness
          ? this.toCredential({
              qualification: value.fitnessCredentials.certification,
              licenseNumber: value.fitnessCredentials.certificationNumber,
              specialties: value.fitnessCredentials.specialties
            })
          : null
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.submitMessage = 'Service provider account submitted for admin approval.';
        },
        error: (error: unknown) => {
          this.errorMessage = this.authService.getErrorMessage(error);
        }
      });
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
      qualification: this.normalizeOptional(credential.qualification ?? ''),
      institution: this.normalizeOptional(credential.institution ?? ''),
      licenseNumber: this.normalizeOptional(credential.licenseNumber ?? ''),
      specialties: this.normalizeOptional(credential.specialties ?? '')
    };
  }

  private normalizeOptional(value: string): string | null {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
}
