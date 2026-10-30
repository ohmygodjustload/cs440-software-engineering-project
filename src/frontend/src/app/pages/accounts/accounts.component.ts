import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

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
  accounts: User[] = [];
  filteredAccounts: User[] = [];
  loading = false;
  error: string | null = null;
  category: string = '';

  get categories(): readonly string[] {
    return ["Client", "Service Provider", "Admin"];
  }

  searchForm = new FormGroup({
    search: new FormControl(''),
    accountType: new FormControl('all')
  });

  ngOnInit(): void {
    this.loadAccounts();

    this.searchForm.valueChanges.subscribe(() => {
      this.filterAppointments();
    });
  }

  getAccountType(account: User): string {
    if (account.isClient) {
      return 'Client';
    } else if (account.isServiceProvider) {
      return 'Service Provider';
    } else if (account.isAdmin) {
      return 'Admin';
    }
    return 'Unknown';
  }

  loadAccounts(): void {
    this.loading = true;
    this.error = null;

    // Simulating API behavior
    setTimeout(() => {
      try {
        this.accounts = [
          {
            firstName:'Priya',
            lastName: 'Nair',
            username: 'priya.nair',
            isClient: true,
            isServiceProvider: false,
            isAdmin: false,
            isActive: true,
            serviceTypes: null,
            id: '1',
          },
          {
            firstName: 'Elena',
            lastName: 'Rossi',
            username: 'elena.rossi',
            email: 'elena.rossi@email.com',
            phone: '098-765-4321',
            isClient: false,
            isServiceProvider: true,
            isAdmin: false,
            isActive: true,
            serviceTypes: ['Haircut', 'Beard Trim'],
            id: '2'
          }
        ];
    } catch (error) {
      this.error = 'Failed to load accounts.';
    } finally {
      this.loading = false;
    }})
  }

  filterAppointments(): void {
    const { search, accountType } = this.searchForm.value;
    const searchString = (search || '').toLowerCase().trim();

    this.filteredAccounts = this.accounts.filter(app => {
      const matchesSearch = 
        app.firstName.toLowerCase().includes(searchString) || 
        app.lastName.toLowerCase().includes(searchString) || 
        app.username.toLowerCase().includes(searchString);

      const matchesType = 
        !accountType || 
        accountType === 'all' //|| 
        // app.accountTypeId.toLowerCase() === accountType.toLowerCase();

      return matchesSearch && matchesType;
    });
  }
}
