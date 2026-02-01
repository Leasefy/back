import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { SignatureAudit } from './signature-audit.interface.js';

export interface SignContractInput {
  acceptedTerms: boolean;
  consentText: string;
  signatureData?: string;
}

@Injectable()
export class SignatureService {
  /**
   * Create a complete audit trail for a signature.
   * Uses server time (not client) for legal validity.
   */
  createAuditTrail(
    signerId: string,
    signerEmail: string,
    signerName: string,
    signerRole: 'LANDLORD' | 'TENANT',
    contractHtml: string,
    input: SignContractInput,
    ipAddress: string,
    userAgent: string,
  ): SignatureAudit {
    return {
      signerId,
      signerEmail,
      signerName,
      signerRole,
      signedAt: new Date().toISOString(), // Server UTC time
      ipAddress: this.normalizeIp(ipAddress),
      userAgent,
      acceptedTerms: input.acceptedTerms,
      consentText: input.consentText,
      documentHash: this.hashDocument(contractHtml),
      signatureData: input.signatureData,
    };
  }

  /**
   * Hash document content using SHA-256.
   * Used to detect any modifications after signing.
   */
  hashDocument(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Verify that a signature's document hash matches current content.
   * Returns false if document was modified after signing.
   */
  verifySignature(
    contractHtml: string,
    signatureAudit: SignatureAudit,
  ): boolean {
    const currentHash = this.hashDocument(contractHtml);
    return currentHash === signatureAudit.documentHash;
  }

  /**
   * Normalize IP address from x-forwarded-for header.
   * Takes first IP if multiple are present.
   */
  private normalizeIp(ip: string): string {
    const firstIp = ip.split(',')[0].trim();
    return firstIp || 'unknown';
  }
}
