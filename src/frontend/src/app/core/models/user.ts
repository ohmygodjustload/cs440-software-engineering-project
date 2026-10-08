/**
 * user.ts — typed view of the C# backend's user payloads.
 *
 * Purpose: gives the front end a typed view of the user contract. It mirrors
 * src/backend/AppointmentScheduler.Api/Models/User.cs — when that record
 * changes, update these interfaces in the same pull request.
 *
 * Notes:
 * - The backend never returns passwords; there is intentionally no password
 *   field here.
 * - There is no update endpoint yet (UsersController is GET-only), so this
 *   model is read-only for now. See user-settings.service.ts for the
 *   documented missing contract.
 */

/**
 * Response body of `GET /api/users` items and `GET /api/users/{id}`
 * (see src/backend/AppointmentScheduler.Api/Models/User.cs).
 */
export interface User {
  /** Unique id (GUID hex without dashes for in-memory store, ObjectId hex for BAAAM). */
  id: string;
  /** Given name, e.g. `Jane`. */
  firstName: string;
  /** Family name, e.g. `Porter`. */
  lastName: string;
  /** Unique login name, e.g. `JanePorter123`. */
  username: string;
  /** Contact email when known. Optional on the backend. */
  email?: string | null;
  /** Contact phone when known. Optional on the backend. */
  phone?: string | null;
  /** True when the account books appointments as a client. */
  isClient: boolean;
  /** True when the account provides services. */
  isServiceProvider: boolean;
  /** True when the account may manage any user's information. */
  isAdmin: boolean;
}
