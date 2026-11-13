import { AppointmentStatus } from './appointment';

export type AppointmentAuditAction = 'CREATED' | 'RESCHEDULED' | 'STATUS_CHANGE' | 'CANCELLED';

export interface AppointmentAuditListItem {
  id: string;
  appointmentId: string;
  appointmentTitle?: string | null;
  changedByUserId: string;
  changedByName?: string | null;
  timestamp: string;
  action: AppointmentAuditAction | string;
  oldStatus?: AppointmentStatus | null;
  newStatus?: AppointmentStatus | null;
}

export interface AppointmentAuditFilters {
  from?: string;
  to?: string;
  action?: AppointmentAuditAction | string;
}
