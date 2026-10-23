import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { ToastService } from '../../core/services/toast.service';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let toastService: jasmine.SpyObj<ToastService>;
  let settingsService: { getCurrentUser: jasmine.Spy };
  let notificationsService: { getPreferences: jasmine.Spy; getNotifications: jasmine.Spy };

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getErrorMessage', 'login']);
    authService.login.and.returnValue(of({ token: 'token', expiresAt: '2099-01-01T00:00:00Z', user: {} as never }));
    toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'show',
      'showLoggedIn',
      'showMissed'
    ]);
    settingsService = { getCurrentUser: jasmine.createSpy('getCurrentUser') };
    settingsService.getCurrentUser.and.returnValue(throwError(() => new Error('no user')));
    notificationsService = {
      getPreferences: jasmine.createSpy('getPreferences'),
      getNotifications: jasmine.createSpy('getNotifications')
    };
    notificationsService.getPreferences.and.returnValue(of({ inBrowserEnabled: false }));
    notificationsService.getNotifications.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: ToastService, useValue: toastService },
        { provide: UserSettingsService, useValue: settingsService },
        { provide: NotificationsService, useValue: notificationsService }
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
            { provide: AuthService, useValue: authService },
            { provide: ToastService, useValue: toastService },
            { provide: UserSettingsService, useValue: settingsService },
            { provide: NotificationsService, useValue: notificationsService }
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

  it('should greet with a login popup on successful sign-in', () => {
    const component = fixture.componentInstance;
    component.form.patchValue({ username: 'JanePorter123', password: 'password123' });

    component.onSubmit();

    expect(toastService.showLoggedIn).toHaveBeenCalled();
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

  describe('post-login redirect', () => {
    let router: Router;

    async function setupWithReturnUrl(returnUrl: string | null) {
      await TestBed.resetTestingModule()
        .configureTestingModule({
          imports: [LoginComponent],
          providers: [
            provideRouter([]),
            {
              provide: ActivatedRoute,
              useValue: {
                snapshot: {
                  queryParamMap: convertToParamMap(
                    returnUrl === null ? {} : { returnUrl }
                  )
                }
              }
            },
            { provide: AuthService, useValue: authService },
            { provide: ToastService, useValue: toastService },
            { provide: UserSettingsService, useValue: settingsService },
            { provide: NotificationsService, useValue: notificationsService }
          ]
        })
        .compileComponents();

      fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
      router = TestBed.inject(Router);
      spyOn(router, 'navigateByUrl').and.resolveTo(true);
    }

    function providerUser() {
      return {
        id: 'provider-1',
        firstName: 'Sam',
        lastName: 'Provider',
        username: 'SamProvider',
        isClient: false,
        isServiceProvider: true,
        isAdmin: false,
        isActive: true
      };
    }

    it('should route a first-time provider to /home-provider when returnUrl is /home', async () => {
      await setupWithReturnUrl('/home');
      authService.login.and.returnValue(
        of({ token: 'token', expiresAt: '2099-01-01T00:00:00Z', user: providerUser() as never })
      );

      fixture.componentInstance.form.patchValue({ username: 'SamProvider', password: 'password123' });
      fixture.componentInstance.onSubmit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/home-provider');
    });

    it('should route a provider to /home-provider when there is no returnUrl', async () => {
      await setupWithReturnUrl(null);
      authService.login.and.returnValue(
        of({ token: 'token', expiresAt: '2099-01-01T00:00:00Z', user: providerUser() as never })
      );

      fixture.componentInstance.form.patchValue({ username: 'SamProvider', password: 'password123' });
      fixture.componentInstance.onSubmit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/home-provider');
    });

    it('should still honor a role-appropriate returnUrl for a provider', async () => {
      await setupWithReturnUrl('/create-slots');
      authService.login.and.returnValue(
        of({ token: 'token', expiresAt: '2099-01-01T00:00:00Z', user: providerUser() as never })
      );

      fixture.componentInstance.form.patchValue({ username: 'SamProvider', password: 'password123' });
      fixture.componentInstance.onSubmit();

      expect(router.navigateByUrl).toHaveBeenCalledWith('/create-slots');
    });
  });
});
