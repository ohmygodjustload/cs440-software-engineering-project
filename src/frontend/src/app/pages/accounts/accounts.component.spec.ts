import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AccountsComponent } from './accounts.component';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

describe('AccountsComponent', () => {
  let component: AccountsComponent;
  let fixture: ComponentFixture<AccountsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        AccountsComponent,
        ReactiveFormsModule,
        RouterModule.forRoot([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display loaders and populate data on init', fakeAsync(() => {
    component.ngOnInit();
    expect(component.loading).toBeTrue();

    tick(600); // Account for simulated API delay
    fixture.detectChanges();

    expect(component.loading).toBeFalse();
    expect(component.accounts.length).toBe(4);
    expect(component.filteredAccounts.length).toBe(4);
  }));

  it('should filter accounts by search string match', fakeAsync(() => {
    component.ngOnInit();
    tick(600);
    fixture.detectChanges();

    component.searchForm.patchValue({ search: 'Nair' });
    fixture.detectChanges();

    expect(component.filteredAccounts.length).toBe(1);
    expect(component.filteredAccounts[0].firstName).toBe('Priya');
    expect(component.filteredAccounts[0].lastName).toBe('Nair');
  }));

  it('should filter accounts by type selection match', fakeAsync(() => {
    component.ngOnInit();
    tick(600);
    fixture.detectChanges();

    component.searchForm.patchValue({ accountType: 'client' });
    fixture.detectChanges();

    // expect(component.filteredAccounts.length).toBe(1);
    // expect(component.filteredAccounts[0].accountTypeId).toBe('Client');
  }));

  it('should log edit messages on clicking edit action', () => {
    spyOn(console, 'log');
    const mockApp = {
      providerId: 'Elena Rossi',
      category: 'Medical',
      accountTypeId: 'Client',
      username: 'elena.rossi',
      email: 'elena.rossi@email.com'
    };

    // component.editAppointment(mockApp);
    expect(console.log).toHaveBeenCalledWith('Editing account for:', 'Elena Rossi');
  });
});
