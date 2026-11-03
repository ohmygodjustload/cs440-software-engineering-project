import { User } from '../models/user';

/** Enhanced accounts have both capabilities on the same signed-in user. */
export function isEnhancedUser(user: User | null | undefined): boolean {
  return !!user && user.isActive !== false && !user.isAdmin && user.isClient && user.isServiceProvider;
}

export function homeRoute(user: User | null | undefined): string {
  if (user?.isAdmin) return '/home-admin';
  if (isEnhancedUser(user)) return '/enhanced-home';
  if (user?.isServiceProvider && user.isActive !== false) return '/home-provider';
  return '/home';
}
