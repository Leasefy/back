/**
 * Event emitted when a contract is activated (SIGNED -> ACTIVE)
 * Contains all data needed to create a Lease
 */
export class ContractActivatedEvent {
  constructor(
    public readonly contractId: string,
    public readonly propertyId: string,
    public readonly landlordId: string,
    public readonly tenantId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly monthlyRent: number,
    public readonly deposit: number,
    public readonly paymentDay: number,
    // Denormalized data for lease
    public readonly propertyAddress: string,
    public readonly propertyCity: string,
    public readonly landlordName: string,
    public readonly landlordEmail: string,
    public readonly tenantName: string,
    public readonly tenantEmail: string,
    public readonly tenantPhone: string | null,
  ) {}
}
