/**
 * health-status.ts — the shape of the C# backend's `GET /api/health` response.
 *
 * Purpose: gives the front end a typed view of one backend payload. It mirrors
 * src/backend/AppointmentScheduler.Api/Models/HealthResponse.cs — when that record changes, update
 * this interface in the same pull request.
 *
 */

/**
 * Response body of `GET /api/health` on the AppointmentScheduler.Api backend
 * (see src/backend/AppointmentScheduler.Api/Models/HealthResponse.cs).
 */
export interface HealthStatus {
  /** Short machine-readable status of the API, e.g. `ok`. */
  status: string;
  /** Name of the service that produced the response. */
  service: string;
  /** ISO-8601 timestamp of when the API generated the response. */
  timestamp: string;
}
