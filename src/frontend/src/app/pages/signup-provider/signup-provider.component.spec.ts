import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { SignupProviderComponent } from './signup-provider.component';

describe('SignupProviderComponent', () => {
  let fixture: ComponentFixture<SignupProviderComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getErrorMessage', 'registerProvider']);
    authService.registerProvider.and.returnValue(
      of({ user: {} as never, requiresApproval: true })
    );

    await TestBed.configureTestingModule({
      imports: [SignupProviderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupProviderComponent);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render service provider account fields', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Create a Service Provider Account');
    expect(page.textContent).toContain('Email');
    expect(page.textContent).toContain('Phone number');
    expect(page.textContent).toContain('Service type');
    expect(page.textContent).toContain('Medical');
    expect(page.textContent).toContain('Beauty');
    expect(page.textContent).toContain('Fitness');
  });

  it('should require at least one service type', () => {
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(component.form.hasError('serviceTypeRequired')).toBeTrue();
  });

  it('should expand medical credentials when medical is selected', () => {
    const component = fixture.componentInstance;

    component.form.controls.services.controls.medical.setValue(true);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Medical credentials');
    expect(page.textContent).toContain('Medical qualification');
    expect(page.textContent).toContain('License number');
  });

  it('should require matching passwords', () => {
    const component = fixture.componentInstance;

    component.form.patchValue({
      firstName: 'Sam',
      lastName: 'Provider',
      username: 'SamProvider',
      email: 'sam@example.com',
      phone: '555-123-4567',
      password: 'password123',
      confirmPassword: 'different123'
    });
    component.form.controls.services.controls.medical.setValue(true);

    expect(component.form.hasError('passwordsMismatch')).toBeTrue();
  });

  it('should register valid provider details for approval', () => {
    const component = fixture.componentInstance;

    component.form.patchValue({
      firstName: 'Sam',
      lastName: 'Provider',
      username: 'SamProvider',
      email: 'sam@example.com',
      phone: '555-123-4567',
      password: 'password123',
      confirmPassword: 'password123'
    });
    component.form.controls.services.controls.medical.setValue(true);
    component.form.controls.medicalCredentials.patchValue({
      qualification: 'MD',
      school: 'BAAAM University',
      licenseNumber: 'MED-123'
    });
    component.onSubmit();

    expect(authService.registerProvider).toHaveBeenCalledWith(
      jasmine.objectContaining({
        firstName: 'Sam',
        lastName: 'Provider',
        username: 'SamProvider',
        email: 'sam@example.com',
        phone: '555-123-4567',
        password: 'password123',
        serviceTypes: ['Medical'],
        medicalCredentials: {
          qualification: 'MD',
          institution: 'BAAAM University',
          licenseNumber: 'MED-123',
          specialties: null
        }
      })
    );
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'provider-pending' }
    });
  });
});
