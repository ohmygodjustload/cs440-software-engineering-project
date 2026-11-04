import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { User } from '../../core/models/user';
import { EditAccountComponent } from './edit-account.component';

describe('EditAccountComponent', () => {
  const account: User = {
    id: 'user-1',
    firstName: 'Jane',
    lastName: 'Porter',
    username: 'JanePorter123',
    email: 'jane@example.com',
    phone: '456-456-4567',
    isClient: true,
    isServiceProvider: false,
    isAdmin: false
  };

  function create(): EditAccountComponent {
    TestBed.configureTestingModule({
      imports: [EditAccountComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: new Map([['id', 'user-1']]) } } }
      ]
    });
    const fixture = TestBed.createComponent(EditAccountComponent);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/users/user-1').flush(account);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('loads account details into the form', () => {
    const component = create();

    expect(component.account).toEqual(account);
    expect(component.form.getRawValue()).toEqual({
      firstName: 'Jane',
      lastName: 'Porter',
      email: 'jane@example.com',
      phone: '456-456-4567'
    });
    expect(component.loading).toBeFalse();
  });

  it('saves edited account details', () => {
    const component = create();
    component.form.controls.lastName.setValue('Updated');
    component.form.controls.lastName.markAsDirty();
    component.save();

    const request = TestBed.inject(HttpTestingController).expectOne('/api/admin/accounts/user-1');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      firstName: 'Jane',
      lastName: 'Updated',
      email: 'jane@example.com',
      phone: '456-456-4567'
    });
    request.flush({ ...account, lastName: 'Updated' });

    expect(component.success).toBe('Account Information has been Sucessfully Updated!');
    expect(component.saving).toBeFalse();
    expect(component.form.pristine).toBeTrue();
  });

  it('rejects invalid account details without saving', () => {
    const component = create();
    component.form.controls.email.setValue('not-an-email');
    component.form.controls.email.markAsDirty();
    component.save();

    expect(component.error).toBe('Please correct the required fields before saving.');
    expect(TestBed.inject(HttpTestingController).match('/api/admin/accounts/user-1')).toEqual([]);
  });
});
