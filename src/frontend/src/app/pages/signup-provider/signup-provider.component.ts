import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

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
  private readonly formBuilder = inject(FormBuilder);

  confirmPasswordVisible = false;
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
    this.submitMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitMessage = 'Service provider account details are ready for admin approval.';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }
}
