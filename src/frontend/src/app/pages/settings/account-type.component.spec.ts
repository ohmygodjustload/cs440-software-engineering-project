import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { User } from '../../core/models/user';
import { AccountModesService } from '../../core/services/account-modes.service';
import { AuthService } from '../../core/services/auth.service';
import { AccountTypeComponent } from './account-type.component';

describe('AccountTypeComponent', () => {
  const user: User = { id: 'one-account', firstName: 'Jane', lastName: 'Doe', username: 'jane', isClient: true, isServiceProvider: false, isAdmin: false };
  let service: jasmine.SpyObj<AccountModesService>;
  beforeEach(() => {
    service = jasmine.createSpyObj<AccountModesService>('AccountModesService', ['status', 'apply', 'enableClient']);
    service.status.and.returnValue(of({ user, application: null }));
    TestBed.configureTestingModule({ imports: [AccountTypeComponent], providers: [provideRouter([]),
      { provide: AccountModesService, useValue: service }, { provide: AuthService, useValue: { getErrorMessage: () => 'Request failed.' } }] });
  });
  function create() { const fixture = TestBed.createComponent(AccountTypeComponent); fixture.detectChanges(); return fixture; }
  it('requires a category and then submits an application for the same account', () => {
    const component = create().componentInstance;
    component.apply(); expect(service.apply).not.toHaveBeenCalled();
    component.form.controls.Medical.setValue(true);
    service.apply.and.returnValue(of({})); component.apply();
    expect(service.apply).toHaveBeenCalledWith(jasmine.objectContaining({ serviceTypes: ['Medical'] }));
    expect(user.isServiceProvider).toBeFalse();
  });
  it('shows pending approval and prevents a duplicate submission', () => {
    service.status.and.returnValue(of({ user, application: { id: 'request', status: 'pending', notes: '', submittedAt: '' } }));
    const fixture = create(); fixture.componentInstance.apply();
    expect(fixture.nativeElement.textContent).toContain('awaiting admin approval');
    expect(service.apply).not.toHaveBeenCalled();
  });
  it('allows an existing provider to enable client booking', () => {
    service.status.and.returnValue(of({ user: { ...user, isClient: false, isServiceProvider: true }, application: null }));
    service.enableClient.and.returnValue(of({ token: 'new', expiresAt: '2099-01-01T00:00:00Z', user: { ...user, isServiceProvider: true } }));
    const fixture = create(); fixture.componentInstance.enableClient(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Client + Service provider');
    expect(fixture.nativeElement.textContent).not.toContain('Open Enhanced Home');
    expect(fixture.nativeElement.textContent).not.toContain('Refresh account status');
    expect(service.enableClient).toHaveBeenCalledTimes(1);
  });
});
