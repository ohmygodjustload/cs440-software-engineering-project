/**
 * appointment.ts — typed view of the C# backend's appointment payloads.
 *
 * Purpose: gives the front end a typed view of the appointment contract. It mirrors
 * src/backend/AppointmentScheduler.Api/Models/Appointment.cs,
 * CreateAppointmentDto.cs, UpdateAppointmentDto.cs, and PagedResult.cs — when those
 * records change, update these interfaces in the same pull request.
 *
 * Notes:
 * - The backend serializes `DateTimeOffset` as ISO-8601 strings, so the front end
 *   types them as `string` (e.g. `"2026-10-05T09:00:00Z"`).
 * - The backend registers `JsonStringEnumConverter`, so enums travel as names
 *   (`"Medical"`, `"Scheduled"`, …) with numbers still accepted for back-compat.
 *
 */

/** Mirrors `AppointmentCategory` (Medical = 0, Beauty = 1, Fitness = 2). */
export type AppointmentCategory = 'Medical' | 'Beauty' | 'Fitness';

/** Mirrors `AppointmentStatus` (Available = 0, Booked = 1, Completed = 2, Canceled = 3, Missed = 4). */
export type AppointmentStatus = 'Available' | 'Booked' | 'Completed' | 'Canceled' | 'Missed';

/**
 * Response body of `GET /api/appointments` items, `GET /api/appointments/{id}`,
 * and `POST /api/appointments`
 * (see src/backend/AppointmentScheduler.Api/Models/Appointment.cs).
 */
export interface Appointment {
  id: string;
  appointmentTypeId?: string | null;
  title: string;
  category: AppointmentCategory;
  startDateTime: string;
  endDateTime: string;
  providerId: string;
  providerName?: string | null;
  userId: string | null;
  location?: string | null;
  notes?: string | null;
  status: AppointmentStatus;
}

/**
 * Body for `POST /api/appointments`
 * (see src/backend/AppointmentScheduler.Api/Models/CreateAppointmentDto.cs).
 */
export interface CreateAppointmentDto {
  title: string;
  category: AppointmentCategory;
  startDateTime: string;
  endDateTime: string;
  providerId: string;
  providerName?: string | null;
  userId?: string | null;
  location?: string | null;
  notes?: string | null;
}

/**
 * Body for `PUT /api/appointments/{id}`. All fields are optional.
 * (see src/backend/AppointmentScheduler.Api/Models/UpdateAppointmentDto.cs).
 */
export interface UpdateAppointmentDto {
  title?: string | null;
  category?: AppointmentCategory | null;
  startDateTime?: string | null;
  endDateTime?: string | null;
  providerId?: string | null;
  providerName?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: AppointmentStatus | null;
}

/**
 * Standard paged envelope used by list endpoints
 * (see src/backend/AppointmentScheduler.Api/Models/PagedResult.cs).
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
