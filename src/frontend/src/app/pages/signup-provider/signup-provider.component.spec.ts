import { ComponentFixture, TestBed, tick, fakeAsync } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

interface RegistrationBody {
  firstName: string;
  lastName: string;
  username: string;
  email: string | null;
  phone: string | null;
  password: string;
  serviceTypes: string[];
  medicalCredentials: { info: string } | null;
  beautyCredentials: { info: string } | null;
  fitnessCredentials: { info: string } | null;
}

import { AuthService } from '../../core/services/auth.service';
import { SignupProviderComponent } from './signup-provider.component';

describe('SignupProviderComponent', () => {
  let fixture: ComponentFixture<SignupProviderComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getErrorMessage',
      'registerProvider',
      'resubmitProvider'
    ]);
    authService.registerProvider.and.returnValue(
      of({ user: {} as never, requiresApproval: true })
    );
    authService.resubmitProvider.and.returnValue(
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

  it('should flag a missing required email inline after a failed submit', () => {
    const component = fixture.componentInstance;

    // Fill everything except email (the reported case) and try to submit.
    component.form.patchValue({
      firstName: 'Sam',
      lastName: 'Provider',
      username: 'SamProvider',
      phone: '555-123-4567',
      password: 'password123',
      confirmPassword: 'password123'
    });
    component.form.controls.services.controls.medical.setValue(true);
    component.onSubmit();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Email is required.');
    expect(authService.registerProvider).not.toHaveBeenCalled();
  });

  it('should expand medical credentials when medical is selected', () => {
    const component = fixture.componentInstance;

    component.form.controls.services.controls.medical.setValue(true);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Medical credentials');

    const info = page.querySelector('#medicalInfo') as HTMLInputElement | null;
    expect(info?.placeholder).toBe('Qualifications: Graduated from [Medical School], [Year].');
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

  it('should register valid provider details for approval', fakeAsync(() => {
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
      info: 'Qualifications: Graduated from BAAAM Medical School, 2015.'
    });
    component.onSubmit();
    fixture.detectChanges();

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
          info: 'Qualifications: Graduated from BAAAM Medical School, 2015.'
        }
      })
    );
    expect(component.successMessage).toBe(
      'Your request has been submitted for approval. Please check back soon for the status of your request.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
    tick(3000);
    fixture.detectChanges();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'provider-pending' }
    });
  }));

  it('should show the confirmation message after successful submission', () => {
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
      info: 'Qualifications: Graduated from BAAAM Medical School, 2015.'
    });
    component.onSubmit();
    fixture.detectChanges();

    expect(component.successMessage).toBe(
      'Your request has been submitted for approval. Please check back soon for the status of your request.'
    );
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('SignupProviderComponent (resubmit mode)', () => {
  let fixture: ComponentFixture<SignupProviderComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getErrorMessage',
      'registerProvider',
      'resubmitProvider'
    ]);
    authService.resubmitProvider.and.returnValue(
      of({ user: {} as never, requiresApproval: true })
    );

    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [SignupProviderComponent],
        providers: [
          provideRouter([]),
          {
            provide: ActivatedRoute,
            useValue: {
              snapshot: { queryParamMap: convertToParamMap({ mode: 'resubmit' }) }
            }
          },
          { provide: AuthService, useValue: authService }
        ]
      })
      .compileComponents();

    fixture = TestBed.createComponent(SignupProviderComponent);
    fixture.detectChanges();
  });

  it('should show the re-submit copy', () => {
    const component = fixture.componentInstance;
    const page = fixture.nativeElement as HTMLElement;

    expect(component.isResubmit).toBeTrue();
    expect(page.textContent).toContain('Re-submit Your Service Provider Application');
    expect(page.textContent).toContain('Re-submit for approval');
  });

  it('should call resubmitProvider (not registerProvider) on submit', () => {
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
    component.form.controls.services.controls.beauty.setValue(true);
    component.onSubmit();

    expect(authService.resubmitProvider).toHaveBeenCalled();
    expect(authService.registerProvider).not.toHaveBeenCalled();
    expect(component.successMessage).toContain('re-submitted for approval');
  });
});

describe('SignupProviderComponent (real HTTP)', () => {
  let fixture: ComponentFixture<SignupProviderComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupProviderComponent, HttpClientTestingModule],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupProviderComponent);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  it('should POST the provider registration request and show the confirmation', () => {
    const component = fixture.componentInstance;

    component.form.patchValue({
      firstName: 'Jane',
      lastName: 'Admin',
      username: 'janeadmin-e2e',
      email: 'jane@example.com',
      phone: '555-0100',
      password: 'password123',
      confirmPassword: 'password123'
    });
    component.form.controls.services.controls.medical.setValue(true);
    component.form.controls.medicalCredentials.patchValue({
      info: 'Graduated from Med School, 2020'
    });

    component.onSubmit();
    fixture.detectChanges();

    const req = http.expectOne('/api/auth/register/provider');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as RegistrationBody;
    expect(body.firstName).toBe('Jane');
    expect(body.lastName).toBe('Admin');
    expect(body.username).toBe('janeadmin-e2e');
    expect(body.serviceTypes).toEqual(['Medical']);
    expect(body.medicalCredentials?.info).toBe('Graduated from Med School, 2020');

    req.flush({ user: {} as never, requiresApproval: true });
    fixture.detectChanges();

    expect(component.successMessage).toBe(
      'Your request has been submitted for approval. Please check back soon for the status of your request.'
    );
  });
});
