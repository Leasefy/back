/**
 * Document type enum matching Prisma schema.
 * Defines the types of documents that can be uploaded with an application.
 *
 * ID_DOCUMENT: Government-issued ID (Cedula)
 * EMPLOYMENT_LETTER: Employment verification letter (Carta laboral)
 * PAY_STUB / INCOME_PROOF: Pay stub or salary slip (Desprendible de nomina)
 * BANK_STATEMENT: Bank account statement (Extracto bancario)
 * CREDIT_REPORT: Credit report (Reporte de credito)
 * OTHER: Additional supporting documents
 */
export enum DocumentType {
  ID_DOCUMENT = 'ID_DOCUMENT',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  PAY_STUB = 'PAY_STUB',
  INCOME_PROOF = 'INCOME_PROOF',
  BANK_STATEMENT = 'BANK_STATEMENT',
  CREDIT_REPORT = 'CREDIT_REPORT',
  OTHER = 'OTHER',
}

/**
 * Maps frontend document type strings to backend DocumentType.
 * Accepts both lowercase frontend style and uppercase backend style.
 */
const DOCUMENT_TYPE_MAP: Record<string, DocumentType> = {
  id_document: DocumentType.ID_DOCUMENT,
  income_proof: DocumentType.INCOME_PROOF,
  employment_letter: DocumentType.EMPLOYMENT_LETTER,
  bank_statements: DocumentType.BANK_STATEMENT,
  bank_statement: DocumentType.BANK_STATEMENT,
  credit_report: DocumentType.CREDIT_REPORT,
  other: DocumentType.OTHER,
  // Uppercase pass-through
  ID_DOCUMENT: DocumentType.ID_DOCUMENT,
  INCOME_PROOF: DocumentType.INCOME_PROOF,
  EMPLOYMENT_LETTER: DocumentType.EMPLOYMENT_LETTER,
  PAY_STUB: DocumentType.PAY_STUB,
  BANK_STATEMENT: DocumentType.BANK_STATEMENT,
  CREDIT_REPORT: DocumentType.CREDIT_REPORT,
  OTHER: DocumentType.OTHER,
};

export function normalizeDocumentType(value: string): DocumentType {
  return DOCUMENT_TYPE_MAP[value] ?? DocumentType.OTHER;
}
