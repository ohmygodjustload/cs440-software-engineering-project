import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { User } from '../models/user';
import { AuthService } from '../services/auth.service';
import { enhancedGuard, homeGuard } from './auth.guard';

describe('enhanced routing guards', () => {
  const user: User = { id: 'account-1', firstName: 'Jane', lastName: 'Doe', username: 'jane',
    isClient: true, isServiceProvider: true, isAdmin: false, isActive: true };
  let auth: jasmine.SpyObj<AuthService>;
  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getCurrentUser', 'isAuthenticated']);
    auth.getCurrentUser.and.returnValue(user);
    auth.isAuthenticated.and.returnValue(true);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
  });
  function run(guard: typeof enhancedGuard) {
    return TestBed.runInInjectionContext(() => guard({} as never, { url: '/enhanced-home' } as never));
  }
  function path(result: unknown) { return TestBed.inject(Router).serializeUrl(result as UrlTree); }
  it('allows an account with both roles', () => expect(run(enhancedGuard)).toBeTrue());
  it('redirects client-only accounts to client Home', () => {
    auth.getCurrentUser.and.returnValue({ ...user, isServiceProvider: false });
    expect(path(run(enhancedGuard))).toBe('/home');
  });
  it('redirects provider-only accounts to provider Home', () => {
    auth.getCurrentUser.and.returnValue({ ...user, isClient: false });
    expect(path(run(enhancedGuard))).toBe('/home-provider');
  });
  it('redirects admins to admin Home', () => {
    auth.getCurrentUser.and.returnValue({ ...user, isAdmin: true });
    expect(path(run(enhancedGuard))).toBe('/home-admin');
  });
  it('uses Enhanced Home when a signed-in dual-role user opens /home', () => {
    expect(path(run(homeGuard))).toBe('/enhanced-home');
  });
});
