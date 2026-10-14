/**
 * provider-request.ts — typed view of the C# backend's provider approval requests.
 *
 * Purpose: mirrors src/backend/AppointmentScheduler.Api/Models/ProviderRequest.cs —
 * when that record changes, update these interfaces in the same pull request.
 */

export type ServiceCategory = 'Medical' | 'Beauty' | 'Fitness';

export interface ServiceCredential {
  info?: string | null;
}

/** A service provider's application for admin approval. */
export interface ProviderRequest {
  id: string;
  /** Id of the pending provider account this request belongs to. */
  userId: string;
  /** Applicant full name at submission time. */
  providerName: string;
  /** Service categories the applicant selected. */
  serviceTypes: ServiceCategory[];
  medicalCredentials?: ServiceCredential | null;
  beautyCredentials?: ServiceCredential | null;
  fitnessCredentials?: ServiceCredential | null;
  /** False while the request is still open / to be reviewed. */
  isReviewed: boolean;
  /** True when an admin approved the request. Only meaningful once reviewed. */
  isApproved: boolean;
  /** Optional admin note ("" when none). */
  notes: string;
  /** When the provider submitted the request (ISO-8601 UTC). */
  submittedAt: string;
  /** When an admin approved/rejected it; null while open. */
  reviewedAt?: string | null;
}

/** Body for POST /api/provider-requests/{id}/approve and /reject. */
export interface ProviderRequestDecision {
  notes?: string | null;
}

/** The two admin logs on the requests page. */
export type ProviderRequestLog = 'pending' | 'closed';
