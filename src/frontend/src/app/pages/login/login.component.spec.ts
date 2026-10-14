import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getErrorMessage', 'login']);
    authService.login.and.returnValue(of({ token: 'token', expiresAt: '2099-01-01T00:00:00Z', user: {} as never }));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the supplied login copy', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('BAAAM Scheduling System');
    expect(page.textContent).toContain('Your time, beautifully organized');
    expect(page.textContent).toContain('Welcome back');
    expect(page.textContent).toContain('Remember me');
    expect(page.textContent).toContain('Forgot password?');
    expect(page.textContent).toContain('New here? Create an account');
  });

  it('should toggle password visibility', () => {
    const component = fixture.componentInstance;

    component.togglePasswordVisibility();

    expect(component.passwordVisible).toBeTrue();
  });

  describe('when arriving after creating an account', () => {
    beforeEach(async () => {
      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [LoginComponent],
          providers: [
            provideRouter([]),
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: { queryParamMap: convertToParamMap({ reason: 'registered' }) }
              }
            },
            { provide: AuthService, useValue: authService }
          ]
        })
        .compileComponents();

      fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
    });

    it('should show the account created confirmation instead of signing in', () => {
      expect(fixture.componentInstance.successMessage).toContain('Account created.');
      expect(fixture.componentInstance.errorMessage).toBeNull();
    });
  });

  it('should require username and password before submission can proceed', () => {
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(component.form.invalid).toBeTrue();
    expect(component.form.controls.username.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
  });

  it('should submit username and password to auth service', () => {
    const component = fixture.componentInstance;
    component.form.patchValue({
      username: 'JanePorter123',
      password: 'password123',
      remember: true
    });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith(
      { username: 'JanePorter123', password: 'password123' },
      true
    );
  });

  it('should offer a re-submit link when the provider request was rejected', () => {
    const component = fixture.componentInstance;
    const rejection =
      'Your service provider request was rejected by an admin. Reason: License missing.';
    authService.getErrorMessage.and.returnValue(rejection);
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    component.form.patchValue({ username: 'RejectedPro', password: 'password123' });
    component.onSubmit();

    expect(component.errorMessage).toBe(rejection);
    expect(component.showResubmit).toBeTrue();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Re-submit your application');
  });

  it('should not offer a re-submit link for other sign-in errors', () => {
    const component = fixture.componentInstance;
    authService.getErrorMessage.and.returnValue('Invalid username or password.');
    authService.login.and.returnValue(throwError(() => new HttpErrorResponse({ status: 401 })));

    component.form.patchValue({ username: 'Someone', password: 'wrong' });
    component.onSubmit();

    expect(component.showResubmit).toBeFalse();
  });
});
