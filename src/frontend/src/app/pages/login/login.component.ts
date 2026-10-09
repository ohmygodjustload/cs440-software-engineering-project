import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

type LoginAccountType = 'client' | 'serviceProvider';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);

  passwordVisible = false;

  readonly form = this.formBuilder.nonNullable.group({
    accountType: ['client' as LoginAccountType, [Validators.required]],
    username: ['', [Validators.required, Validators.maxLength(100)]],
    password: ['', [Validators.required]],
    remember: [false]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    // Authentication will be connected here when the backend exposes a login endpoint.
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }
}
