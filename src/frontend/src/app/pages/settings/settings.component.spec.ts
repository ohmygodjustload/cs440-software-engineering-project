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

  it('should expose accessible labels, tabs, and the privacy summary', () => {
    const fixture = configure({ getCurrentUser: () => of(demoUser) });

    expect(fixture.nativeElement.querySelector('label[for="settings-fullname"]')).not.toBeNull();
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('.settings-tab')).map((t) =>
      (t as HTMLElement).textContent?.trim()
    );
    expect(tabs).toEqual(['Profile', 'Login & security', 'Preferences', 'Privacy']);
    const active = fixture.nativeElement.querySelector('.settings-tab--active') as HTMLElement;
    expect(active.getAttribute('aria-current')).toBe('page');
    const privacy = fixture.nativeElement.querySelector('.privacy-text') as HTMLElement;
    expect(privacy.textContent).toContain('only your own personal and appointment data');
  });

  it('should describe the admin privacy rule for admin accounts', () => {
    const fixture = configure({
      getCurrentUser: () => of({ ...demoUser, isAdmin: true })
    });
    const privacy = fixture.nativeElement.querySelector('.privacy-text') as HTMLElement;
    expect(privacy.textContent).toContain('can manage any user');
  });
});

