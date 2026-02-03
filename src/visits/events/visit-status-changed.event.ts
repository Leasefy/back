import { VisitStatus } from '../../common/enums/index.js';

/**
 * Event emitted when a visit status changes.
 * Used by Phase 13 (Notifications) to notify relevant party.
 */
export class VisitStatusChangedEvent {
  constructor(
    public readonly visitId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly oldStatus: VisitStatus,
    public readonly newStatus: VisitStatus,
    public readonly changedBy: 'TENANT' | 'LANDLORD',
    public readonly changedByUserId: string,
    public readonly visitDate: Date,
    public readonly startTime: string,
    public readonly propertyTitle: string,
    public readonly reason?: string,
  ) {}
}
