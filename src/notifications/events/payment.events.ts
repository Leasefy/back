/**
 * Event emitted when tenant uploads payment receipt.
 */
export class PaymentReceiptUploadedEvent {
  constructor(
    public readonly paymentRequestId: string,
    public readonly leaseId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly propertyAddress: string,
    public readonly amount: number,
    public readonly tenantName: string,
  ) {}
}

/**
 * Event emitted when landlord validates (approves/rejects) payment.
 */
export class PaymentValidatedEvent {
  constructor(
    public readonly paymentRequestId: string,
    public readonly leaseId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly amount: number,
    public readonly approved: boolean,
    public readonly landlordName: string,
  ) {}
}

/**
 * Event emitted when tenant opens payment dispute.
 */
export class PaymentDisputeOpenedEvent {
  constructor(
    public readonly disputeId: string,
    public readonly paymentRequestId: string,
    public readonly leaseId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly amount: number,
    public readonly tenantName: string,
  ) {}
}
