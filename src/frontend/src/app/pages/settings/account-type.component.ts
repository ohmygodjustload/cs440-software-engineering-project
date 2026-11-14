import { Component, DestroyRef, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppointmentCategory } from '../../core/models/appointment';
import { User } from '../../core/models/user';
import { AccountModesService, AccountModeStatus } from '../../core/services/account-modes.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-account-type',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account-type.component.html',
  styleUrl: './account-type.component.css'
})
export class AccountTypeComponent implements OnInit {
  private readonly service = inject(AccountModesService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  @Output() readonly userChanged = new EventEmitter<User>();
  readonly categories: AppointmentCategory[] = ['Medical', 'Beauty', 'Fitness'];
  readonly form = this.fb.nonNullable.group({
    Medical: [false], Beauty: [false], Fitness: [false],
    medicalInfo: ['', Validators.maxLength(500)],
    beautyInfo: ['', Validators.maxLength(500)],
    fitnessInfo: ['', Validators.maxLength(500)]
  });
  status: AccountModeStatus | null = null;
  loading = false;
  saving = false;
  error = '';
  message = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading || this.saving) return;
    this.loading = true;
    this.error = '';
    this.service.status().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading = false))
      .subscribe({ next: status => { this.status = status; this.userChanged.emit(status.user); },
        error: error => this.error = this.auth.getErrorMessage(error) });
  }

  enableClient(): void {
    if (this.saving || this.loading || !this.status?.user.isServiceProvider || this.status.user.isClient) return;
    this.saving = true; this.error = ''; this.message = '';
    this.service.enableClient().pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving = false))
      .subscribe({ next: response => {
        if (this.status) this.status = { ...this.status, user: response.user };
        this.userChanged.emit(response.user);
        this.message = 'Client booking is enabled. You can now use both roles on this account.';
      }, error: error => this.error = this.auth.getErrorMessage(error) });
  }

  apply(): void {
    if (this.saving || this.loading || this.status?.application?.status === 'pending' || this.status?.user.isServiceProvider) return;
    const value = this.form.getRawValue();
    const serviceTypes = this.categories.filter(category => value[category]);
    if (!serviceTypes.length || this.form.invalid) {
      this.error = 'Select at least one category and keep qualifications to 500 characters or fewer.';
      return;
    }
    this.saving = true; this.error = ''; this.message = '';
    const credential = (selected: boolean, info: string) => selected && info.trim() ? { info: info.trim() } : null;
    this.service.apply({ serviceTypes,
      medicalCredentials: credential(value.Medical, value.medicalInfo),
      beautyCredentials: credential(value.Beauty, value.beautyInfo),
      fitnessCredentials: credential(value.Fitness, value.fitnessInfo)
    }).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => {
      this.saving = false;
    })).subscribe({ next: () => {
      this.message = 'Application submitted. You can keep booking as a client while an admin reviews it.';
      this.form.reset();
      this.saving = false;
      this.load();
    }, error: error => this.error = this.auth.getErrorMessage(error) });
  }
}
