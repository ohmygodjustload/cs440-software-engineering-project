import { Appointment, AppointmentCategory } from './appointment';

/** An open appointment created by a provider. Status is always 'Available' and userId is null. */
export type Slot = Appointment & { status: 'Available'; userId: null };

export interface CreateSlotDto { appointmentTypeId: string; startTime: string; }
export interface UpdateSlotDto { appointmentTypeId?: string; startTime?: string; }

/** Optional query for `GET /api/slots`. `from`/`to` are ISO-8601 UTC strings on the slot start time. */
export interface AvailableSlotFilters {
  category?: AppointmentCategory;
  providerId?: string;
  from?: string;
  to?: string;
}

/** Body for `POST /api/slots/{id}/book`. The client comes from the JWT, never the body. */
export interface BookSlotDto { notes?: string; }

/** A slot a client has booked: the `POST /api/slots/{id}/book` response and `GET /api/appointments/mine` items. */
export type BookedAppointment = Appointment & { status: 'Booked'; userId: string };
