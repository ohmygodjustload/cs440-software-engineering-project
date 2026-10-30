import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AccountsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    component = TestBed.createComponent(AccountsComponent).componentInstance;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads accounts and filters by search and type', () => {
    component.ngOnInit();
    http.expectOne('/api/admin/accounts').flush([
      { id: '1', firstName: 'Priya', lastName: 'Nair', username: 'priya', email: 'priya@example.com',
        isClient: true, isServiceProvider: false, isAdmin: false },
      { id: '2', firstName: 'Elena', lastName: 'Rossi', username: 'elena', email: 'elena@example.com',
        isClient: false, isServiceProvider: true, isAdmin: false }
    ]);

    expect(component.loading).toBeFalse();
    expect(component.filteredAccounts.length).toBe(2);
    component.searchForm.patchValue({ search: 'Nair' });
    expect(component.filteredAccounts.map(account => account.id)).toEqual(['1']);
    component.searchForm.patchValue({ search: '', accountType: 'Service Provider' });
    expect(component.filteredAccounts.map(account => account.id)).toEqual(['2']);
  });
});
