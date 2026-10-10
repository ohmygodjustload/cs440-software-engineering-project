import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SignupProviderComponent } from './signup-provider.component';

describe('SignupProviderComponent', () => {
  let fixture: ComponentFixture<SignupProviderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupProviderComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupProviderComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render service provider account fields', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Create a service provider account');
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

  it('should show an approval message for valid provider details', () => {
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
    component.onSubmit();

    expect(component.submitMessage).toContain('admin approval');
  });
});
