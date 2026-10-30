import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { User } from '../../core/models/user';
import { fieldErrorMessage } from '../../core/validation/field-error';

@Component({
  selector: 'app-edit-account',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit-account.component.html',
  styleUrl: './edit-account.component.css'
})
export class EditAccountComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.email, Validators.maxLength(320)]],
    phone: ['', [Validators.maxLength(50)]]
  });
  account: User | null = null;
  loading = true;
  saving = false;
  error: string | null = null;
  success = '';

  ngOnInit(): void {
    const id = this.route.snapshot.queryParamMap.get('id');
    if (!id) { this.error = 'No account was selected.'; this.loading = false; return; }
    this.http.get<User>(`/api/users/${encodeURIComponent(id)}`).subscribe({
      next: (account) => {
        this.account = account;
        if (account.isServiceProvider) {
          this.form.controls.email.addValidators(Validators.required);
          this.form.controls.phone.addValidators(Validators.required);
          this.form.controls.email.updateValueAndValidity();
          this.form.controls.phone.updateValueAndValidity();
        }
        this.form.patchValue({
          firstName: account.firstName, lastName: account.lastName,
          email: account.email ?? '', phone: account.phone ?? ''
        });
        this.loading = false;
      },
      error: () => { this.error = 'Failed to load account.'; this.loading = false; }
    });
  }

  save(): void {
    if (!this.account || this.saving || this.form.pristine) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error = 'Please correct the required fields before saving.';
      return;
    }
    this.saving = true;
    this.error = null;
    this.http.put<User>(`/api/admin/accounts/${encodeURIComponent(this.account.id)}`, this.form.getRawValue()).subscribe({
      next: (account) => {
        this.account = account;
        this.success = 'Account Information has been Sucessfully Updated!';
        this.saving = false;
        this.form.markAsPristine();
      },
      error: () => { this.error = 'Could not save this account.'; this.saving = false; }
    });
  }

  cancel(): void { void this.router.navigate(['/accounts']); }

  fieldError(controlName: string, label: string): string | null {
    return fieldErrorMessage(this.form.get(controlName), label);
  }
}
