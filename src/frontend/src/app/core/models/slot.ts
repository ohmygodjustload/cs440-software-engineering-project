import { Appointment } from './appointment';

/** An open appointment created by a provider. Status is always 'Available' and userId is null. */
export type Slot = Appointment & { status: 'Available'; userId: null };

export interface CreateSlotDto { appointmentTypeId: string; startTime: string; }
export interface UpdateSlotDto { appointmentTypeId?: string; startTime?: string; }
