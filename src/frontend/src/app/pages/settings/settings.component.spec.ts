import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { User } from '../../core/models/user';
import { UserSettingsService } from '../../core/services/user-settings.service';
import { SettingsComponent } from './settings.component';

const demoUser: User = {
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

function configure(serviceStub: Partial<UserSettingsService>): ComponentFixture<SettingsComponent> {
  TestBed.configureTestingModule({
    imports: [SettingsComponent],
    providers: [{ provide: UserSettingsService, useValue: serviceStub }]
  });
  TestBed.compileComponents();
  const fixture = TestBed.createComponent(SettingsComponent);
  fixture.detectChanges();
  return fixture;
}

describe('SettingsComponent', () => {
  it('should create and load the current user into the form', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });

    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.componentInstance.form.controls.fullName.value).toBe('Jane Porter');
    expect(fixture.componentInstance.form.controls.email.value).toBe('jane@example.com');
    expect(fixture.nativeElement.querySelector('.settings-save').disabled).toBe(true);
  });

  it('should show a retry state when loading fails', () => {
    const fixture = configure({ getCurrentUser: () => throwError(() => new Error('down')) });

    expect(fixture.nativeElement.textContent).toContain('Could not load your settings');
    expect(fixture.nativeElement.querySelector('.settings-retry')).not.toBeNull();
  });

  it('should enable Save only after a meaningful change', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });
    const component = fixture.componentInstance;

    expect(component.isDirty).toBe(false);
    component.form.controls.notifyFitness.setValue(false);
    fixture.detectChanges();
    expect(component.isDirty).toBe(true);
    const save = fixture.nativeElement.querySelector('.settings-save') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('should flag invalid email and phone values', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });
    const component = fixture.componentInstance;

    component.form.controls.email.setValue('not-an-email');
    component.form.controls.email.markAsTouched();
    component.form.controls.phone.setValue('abc');
    component.form.controls.phone.markAsTouched();
    fixture.detectChanges();

    expect(component.form.invalid).toBe(true);
    expect(component.canSave).toBe(false);
    expect(fixture.nativeElement.querySelector('#settings-email-error')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#settings-phone-error')).not.toBeNull();
  });

  it('should accept international names and phone formats', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });
    const component = fixture.componentInstance;

    component.form.controls.fullName.setValue('José García-López');
    component.form.controls.phone.setValue('+44 20 7946 0958');
    expect(component.form.controls.fullName.valid).toBe(true);
    expect(component.form.controls.phone.valid).toBe(true);
  });

  it('should preserve edits and report the missing endpoint on save', () => {
    const fixture = configure({
      getCurrentUser: () => of(demoUser),
      saveSettings: () => throwError(() => new Error('Saving is unavailable: no endpoint.'))
    });
    const component = fixture.componentInstance;

    component.form.controls.fullName.setValue('Jane Updated');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.settings-save') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(component.saving).toBe(false);
    expect(component.saveError).toContain('no endpoint');
    expect(component.form.controls.fullName.value).toBe('Jane Updated');
  });

  it('should expose accessible tablist, panels, and per-tab content', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });
    const component = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('[role="tablist"]')).not.toBeNull();
    const tabs = Array.from(root.querySelectorAll('[role="tab"]')).map((t) =>
      (t as HTMLElement).textContent?.trim()
    );
    expect(tabs).toEqual(['Profile', 'Login & security', 'Preferences', 'Privacy']);

    // Profile panel is visible initially with the identity form.
    expect(root.querySelector('label[for="settings-fullname"]')).not.toBeNull();
    expect(root.querySelector('#settings-panel-preferences')).toBeNull();

    // Login & security panel shows read-only facts and no password controls.
    component.selectTab('login');
    fixture.detectChanges();
    expect(root.querySelector('#settings-panel-login')).not.toBeNull();
    expect(root.textContent).toContain('JanePorter123');
    expect(root.textContent).toContain('Password changes unavailable');
    expect(root.querySelector('input[type="password"]')).toBeNull();

    // Preferences panel holds the calendar + notification controls.
    component.selectTab('preferences');
    fixture.detectChanges();
    expect(root.querySelector('#settings-panel-preferences')).not.toBeNull();
    expect(root.querySelector('label[for="settings-calendar-view"]')).not.toBeNull();
    expect(root.querySelectorAll('.notify-option').length).toBe(3);

    // Privacy panel explains data handling with no security-boundary claim.
    component.selectTab('privacy');
    fixture.detectChanges();
    expect(root.querySelector('#settings-panel-privacy')).not.toBeNull();
    expect(root.textContent).toContain('no security boundary');

    // Active tab is exposed via aria-selected on the vertical sidebar item.
    const active = root.querySelector('#settings-tab-privacy') as HTMLElement;
    expect(active.getAttribute('aria-selected')).toBe('true');
    expect(active.classList.contains('settings-side__item--active')).toBe(true);
    expect(root.querySelector('.settings-side')?.getAttribute('aria-orientation')).toBe('vertical');
  });

  it('should render sidebar items with a non-pill flat style', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });
    const root = fixture.nativeElement as HTMLElement;
    const items = Array.from(root.querySelectorAll('.settings-side__item'));
    expect(items.length).toBe(4);
    expect(root.querySelector('.settings-section')).not.toBeNull();
  });

  it('should derive username and roles from the loaded record', () => {
    const fixture = configure({
      getCurrentUser: () => of({ ...demoUser, isAdmin: true, isServiceProvider: true })
    });
    const component = fixture.componentInstance;
    expect(component.username).toBe('JanePorter123');
    expect(component.roleSummary).toContain('Admin');
    expect(component.roleSummary).toContain('Client');
  });
});

