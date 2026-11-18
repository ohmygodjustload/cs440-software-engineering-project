import { User } from '../models/user';
import { homeRoute, isEnhancedUser } from './home-route';

describe('homeRoute', () => {
  const user: User = { id: 'account-1', firstName: 'Jane', lastName: 'Doe', username: 'jane',
    isClient: true, isServiceProvider: true, isAdmin: false, isActive: true };
  it('sends an account with both capabilities to Enhanced Home', () => {
    expect(homeRoute(user)).toBe('/enhanced-home');
    expect(isEnhancedUser(user)).toBeTrue();
  });
  it('keeps client-only and provider-only destinations', () => {
    expect(homeRoute({ ...user, isServiceProvider: false })).toBe('/home');
    expect(homeRoute({ ...user, isClient: false })).toBe('/home-provider');
  });
  it('gives the admin dashboard priority', () => {
    expect(homeRoute({ ...user, isAdmin: true })).toBe('/home-admin');
    expect(isEnhancedUser({ ...user, isAdmin: true })).toBeFalse();
  });
  it('does not grant enhanced access to inactive or missing accounts', () => {
    expect(isEnhancedUser({ ...user, isActive: false })).toBeFalse();
    expect(isEnhancedUser(null)).toBeFalse();
    expect(homeRoute(null)).toBe('/home');
  });
});
