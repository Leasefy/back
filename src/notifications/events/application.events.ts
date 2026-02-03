/**
 * Event emitted when an application is submitted.
 */
export class ApplicationSubmittedEvent {
  constructor(
    public readonly applicationId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly propertyAddress: string,
    public readonly tenantName: string,
  ) {}
}

/**
 * Event emitted when an application status changes (approved/rejected/info-requested).
 */
export class ApplicationStatusChangedEvent {
  constructor(
    public readonly applicationId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly newStatus: string,
    public readonly propertyTitle: string,
    public readonly landlordName: string,
  ) {}
}
