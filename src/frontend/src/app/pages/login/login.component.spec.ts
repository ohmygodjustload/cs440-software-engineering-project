import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the supplied login copy', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('BAAAM Scheduling');
    expect(page.textContent).toContain('Your time, beautifully organized');
    expect(page.textContent).toContain('Welcome back');
    expect(page.textContent).toContain('User');
    expect(page.textContent).toContain('Service provider');
    expect(page.textContent).toContain('Remember me');
    expect(page.textContent).toContain('Forgot password?');
    expect(page.textContent).toContain('New here? Create an account');
  });

  it('should default to user login', () => {
    expect(fixture.componentInstance.form.controls.accountType.value).toBe('client');
  });

  it('should toggle password visibility', () => {
    const component = fixture.componentInstance;

    component.togglePasswordVisibility();

    expect(component.passwordVisible).toBeTrue();
  });

  it('should require username and password before submission can proceed', () => {
    const component = fixture.componentInstance;

    component.onSubmit();

    expect(component.form.invalid).toBeTrue();
    expect(component.form.controls.username.touched).toBeTrue();
    expect(component.form.controls.password.touched).toBeTrue();
  });
});
