import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { User } from '../models/user';
import { AuthService } from '../services/auth.service';
import { AccountModesService } from '../services/account-modes.service';
import { accountHomeGuard } from './account-home.guard';

describe('permanent account Home', () => {
  const client: User = { id: 'same-account', firstName: 'Jane', lastName: 'Doe', username: 'jane',
    isClient: true, isServiceProvider: false, isAdmin: false, isActive: true };
  const both = { ...client, isServiceProvider: true };
  let auth: jasmine.SpyObj<AuthService>;
  let modes: jasmine.SpyObj<AccountModesService>;
  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser', 'isAuthenticated', 'clearToken']);
    modes = jasmine.createSpyObj<AccountModesService>('AccountModesService', ['status', 'refreshSession']);
    auth.isAuthenticated.and.returnValue(true); auth.getCurrentUser.and.returnValue(client);
    modes.status.and.returnValue(of({ user: client, application: null }));
    modes.refreshSession.and.returnValue(of({ token: 'fresh', expiresAt: '2099-01-01T00:00:00Z', user: both }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: AccountModesService, useValue: modes }] });
  });
  async function destination(path = 'home') {
    const outcome = TestBed.runInInjectionContext(() => accountHomeGuard({ routeConfig: { path } } as never, { url: '/' + path } as never));
    const resolved = isObservable(outcome) ? await firstValueFrom(outcome) : await outcome;
    return resolved instanceof UrlTree ? TestBed.inject(Router).serializeUrl(resolved) : resolved;
  }
  it('uses Enhanced Home for a fresh both-role sign-in even through provider Home', async () => {
    auth.getCurrentUser.and.returnValue(both); modes.status.and.returnValue(of({ user: both, application: null }));
    expect(await destination('home-provider')).toBe('/enhanced-home');
    expect(modes.refreshSession).not.toHaveBeenCalled();
  });
  it('detects approval after login and refreshes the token before changing Home', async () => {
    modes.status.and.returnValue(of({ user: both, application: null }));
    expect(await destination()).toBe('/enhanced-home');
    expect(modes.refreshSession).toHaveBeenCalledTimes(1);
  });
  it('keeps an unapproved client on client Home', async () => expect(await destination()).toBeTrue());
  it('keeps provider-only accounts on provider Home', async () => {
    const provider = { ...client, isClient: false, isServiceProvider: true };
    auth.getCurrentUser.and.returnValue(provider); modes.status.and.returnValue(of({ user: provider, application: null }));
    expect(await destination('home-provider')).toBeTrue();
  });
  it('keeps admin navigation separate without calling account modes', async () => {
    auth.getCurrentUser.and.returnValue({ ...client, isAdmin: true });
    expect(await destination()).toBe('/home-admin'); expect(modes.status).not.toHaveBeenCalled();
  });
  it('does not promote a pending client during a network failure', async () => {
    modes.status.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));
    expect(await destination()).toBeTrue(); expect(modes.refreshSession).not.toHaveBeenCalled();
  });
  it('returns a rejected session to login', async () => {
    modes.status.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    expect(await destination()).toContain('/login'); expect(auth.clearToken).toHaveBeenCalled();
  });
});
