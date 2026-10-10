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

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
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
      confirmPassword: ['', [Validators.required]]
    },
    { validators: passwordsMatchValidator }
  );

  get hasPasswordMismatch(): boolean {
    return this.form.hasError('passwordsMismatch') && this.form.controls.confirmPassword.touched;
  }

  onSubmit(): void {
    this.submitMessage = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitMessage = 'Account details are ready. Backend registration will be connected later.';
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  toggleConfirmPasswordVisibility(): void {
    this.confirmPasswordVisible = !this.confirmPasswordVisible;
  }
}
