/**
 * Event emitted when a tenant requests a property visit.
 * Used by Phase 13 (Notifications) to send email/push to landlord.
 */
export class VisitRequestedEvent {
  constructor(
    public readonly visitId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly visitDate: Date,
    public readonly startTime: string,
    public readonly endTime: string,
    public readonly tenantName: string,
    public readonly propertyTitle: string,
    public readonly propertyAddress: string,
    public readonly tenantNotes?: string,
  ) {}
}
