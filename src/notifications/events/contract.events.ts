/**
 * Event emitted when contract is ready for tenant to sign.
 */
export class ContractReadyEvent {
  constructor(
    public readonly contractId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly propertyAddress: string,
    public readonly landlordName: string,
  ) {}
}

/**
 * Event emitted when one party signs the contract.
 */
export class ContractSignedEvent {
  constructor(
    public readonly contractId: string,
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly landlordId: string,
    public readonly propertyTitle: string,
    public readonly signedBy: 'LANDLORD' | 'TENANT',
    public readonly signerName: string,
    public readonly fullyCompleted: boolean,
  ) {}
}
