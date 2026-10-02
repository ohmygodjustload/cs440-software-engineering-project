/**
 * calendar-item.ts — typed view of the C# backend's lightweight calendar payload.
 *
 * Purpose: gives the front end a typed view of `GET /api/calendar`. It mirrors
 * src/backend/AppointmentScheduler.Api/Models/CalendarItem.cs — when that record
 * changes, update this interface in the same pull request.
 *
 */

import { AppointmentCategory, AppointmentStatus } from './appointment';

/**
 * Lightweight calendar payload so the calendar page does not over-fetch
 * (see src/backend/AppointmentScheduler.Api/Models/CalendarItem.cs).
 */
export interface CalendarItem {
  /** Unique id of the appointment. */
  id: string;
  /** Short title, e.g. `Dental checkup`. */
  title: string;
  /** Service category: Medical, Beauty, or Fitness. */
  category: AppointmentCategory;
  /** Appointment start as an ISO-8601 string in UTC. */
  startDateTime: string;
  /** Appointment end as an ISO-8601 string in UTC. */
  endDateTime: string;
  /** Lifecycle status. */
  status: AppointmentStatus;
}
