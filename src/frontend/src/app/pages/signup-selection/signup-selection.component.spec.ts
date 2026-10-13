import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { SignupSelectionComponent } from './signup-selection.component';

describe('SignupSelectionComponent', () => {
  let fixture: ComponentFixture<SignupSelectionComponent>;
  let component: SignupSelectionComponent;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupSelectionComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(SignupSelectionComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render both account type options', () => {
    const page = fixture.nativeElement as HTMLElement;

    expect(page.textContent).toContain('Create an account');
    expect(page.textContent).toContain('Client');
    expect(page.textContent).toContain('Service provider');
    expect(page.textContent).toContain('Continue');
    expect(page.textContent).toContain('Already have an account? Sign in');
  });

  it('should keep continue disabled until an account type is chosen', () => {
    const page = fixture.nativeElement as HTMLElement;
    const continueButton = page.querySelector<HTMLButtonElement>('.signup-submit');

    expect(continueButton?.disabled).toBeTrue();

    component.select('client');
    fixture.detectChanges();

    expect(continueButton?.disabled).toBeFalse();
  });

  it('should only keep one account type selected at a time', () => {
    component.select('client');
    component.select('serviceProvider');

    expect(component.selectedType).toBe('serviceProvider');

    component.select('client');

    expect(component.selectedType).toBe('client');
  });

  it('should route continue to the matching signup form', () => {
    component.select('serviceProvider');
    component.continue();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/signup/provider');

    component.select('client');
    component.continue();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/signup/user');
  });

  it('should not navigate when continue is pressed without a selection', () => {
    component.continue();

    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});