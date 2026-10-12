import { AppointmentCategory } from './appointment';

// Add real API provider IDs here when specialty text does not identify a category.
// A provider can belong to multiple categories.
export const PROVIDER_CATEGORIES_BY_ID: Record<string, readonly AppointmentCategory[]> = {
  // 'actual-provider-id': ['Beauty', 'Fitness']
};

// Explicit mappings for the existing demo seeds. Add confirmed specialties here.
const SPECIALTY_CATEGORIES: Record<string, readonly AppointmentCategory[]> = {
  general: ['Medical'],
  medical: ['Medical'],
  beauty: ['Beauty'],
  fitness: ['Fitness']
};

export function providerCategories(provider: {
  id: string;
  specialty?: string | null;
}): readonly AppointmentCategory[] {
  return PROVIDER_CATEGORIES_BY_ID[provider.id] ??
    SPECIALTY_CATEGORIES[provider.specialty?.trim().toLowerCase() ?? ''] ?? [];
}
