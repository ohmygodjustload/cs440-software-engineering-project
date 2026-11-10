import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { User } from '../../core/models/user';
import { LoadingComponent } from '../../core/components/loading/loading.component';

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LoadingComponent],
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {
  private readonly http = inject(HttpClient);

  accounts: User[] = [];
  filteredAccounts: User[] = [];
  loading = false;
  error: string | null = null;

  get categories(): readonly string[] {
    return ['Client', 'Service Provider', 'Admin'];
  }

  searchForm = new FormGroup({
    search: new FormControl(''),
    accountType: new FormControl('all')
  });

  ngOnInit(): void {
    this.loadAccounts();
    this.searchForm.valueChanges.subscribe(() => this.filterAccounts());
  }

  getAccountType(account: User): string {
    if (account.isAdmin) return 'Admin';
    if (account.isClient) return 'Client';
    if (account.isServiceProvider) return 'Service Provider';
    return 'Unknown';
  }

  loadAccounts(): void {
    this.loading = true;
    this.error = null;
    this.http.get<User[]>('/api/admin/accounts').subscribe({
      next: (accounts) => {
        this.accounts = accounts ?? [];
        this.filterAccounts();
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to load accounts.';
        this.loading = false;
      }
    });
  }

  filterAccounts(): void {
    const { search, accountType } = this.searchForm.value;
    const searchString = (search || '').toLowerCase().trim();
    this.filteredAccounts = this.accounts.filter((account) => {
      const matchesSearch =
        !searchString ||
        account.firstName.toLowerCase().includes(searchString) ||
        account.lastName.toLowerCase().includes(searchString) ||
        account.username.toLowerCase().includes(searchString) ||
        (account.email ?? '').toLowerCase().includes(searchString);
      const type = this.getAccountType(account);
      const matchesType =
        !accountType || accountType === 'all' || type.toLowerCase() === accountType.toLowerCase();
      return matchesSearch && matchesType;
    });
  }
}
