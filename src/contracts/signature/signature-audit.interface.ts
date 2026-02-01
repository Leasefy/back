/**
 * Signature audit trail for Ley 527/1999 compliance.
 * Captures all data required for legal validity of electronic signatures.
 */
export interface SignatureAudit {
  // Signer identification
  signerId: string; // UUID of signer (User.id)
  signerEmail: string; // Email for identification
  signerRole: 'LANDLORD' | 'TENANT';
  signerName: string; // Full name at time of signing

  // Authentication proof
  signedAt: string; // ISO 8601 UTC timestamp (server time, not client)
  ipAddress: string; // Signer's IP address
  userAgent: string; // Browser/device info

  // Consent proof (required by Ley 527)
  acceptedTerms: boolean; // Explicit consent checkbox
  consentText: string; // Exact text user agreed to

  // Document integrity
  documentHash: string; // SHA-256 of contract HTML at signing

  // Optional: drawn signature
  signatureData?: string; // Base64 PNG of drawn signature
}
