import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SignupComponent } from './signup.component';

describe('SignupComponent', () => {
  let fixture: ComponentFixture<SignupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the normal user create account copy', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Create an account');
    expect(page.textContent).toContain('First name');
    expect(page.textContent).toContain('Last name');
    expect(page.textContent).toContain('Username');
    expect(page.textContent).toContain('Password');
    expect(page.textContent).toContain('Confirm password');
    expect(page.textContent).toContain('Already have an account? Sign in');
  });

  it('should require the account fields before submission can proceed', () => {
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(component.form.invalid).toBeTrue();
    expect(component.form.controls.firstName.touched).toBeTrue();
    expect(component.form.controls.lastName.touched).toBeTrue();
    expect(component.form.controls.username.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
  });

  it('should require matching passwords', () => {
    const component = fixture.componentInstance;

    component.form.setValue({
      firstName: 'Jane',
      lastName: 'Porter',
      username: 'JanePorter123',
      password: 'password123',
      confirmPassword: 'different123'
    });

    expect(component.form.hasError('passwordsMismatch')).toBeTrue();
  });

  it('should toggle password visibility controls', () => {
    const component = fixture.componentInstance;

    component.togglePasswordVisibility();
    component.toggleConfirmPasswordVisibility();

    expect(component.passwordVisible).toBeTrue();
    expect(component.confirmPasswordVisible).toBeTrue();
  });

  it('should show a frontend-only success message for valid details', () => {
    const component = fixture.componentInstance;

    component.form.setValue({
      firstName: 'Jane',
      lastName: 'Porter',
      username: 'JanePorter123',
      password: 'password123',
      confirmPassword: 'password123'
    });
    component.onSubmit();

    expect(component.submitMessage).toContain('Backend registration will be connected later.');
  });
});
