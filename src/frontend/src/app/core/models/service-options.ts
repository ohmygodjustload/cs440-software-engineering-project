import { AppointmentCategory } from './appointment';

// Example options only. Replace these names with your team's actual services.
// The API currently saves the selected name as the appointment title.
export const SERVICE_OPTIONS: Record<AppointmentCategory, readonly string[]> = {
  Medical: ['Physical', 'Dental checkup', 'Eye exam'],
  Beauty: ['Haircut', 'Manicure', 'Facial'],
  Fitness: ['Private yoga session', 'Personal training', 'Pilates']
};
