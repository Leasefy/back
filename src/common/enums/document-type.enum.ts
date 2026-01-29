/**
 * Document type enum matching Prisma schema.
 * Defines the types of documents that can be uploaded with an application.
 *
 * ID_DOCUMENT: Government-issued ID (Cedula)
 * EMPLOYMENT_LETTER: Employment verification letter (Carta laboral)
 * PAY_STUB: Pay stub or salary slip (Desprendible de nomina)
 * BANK_STATEMENT: Bank account statement (Extracto bancario)
 * OTHER: Additional supporting documents
 */
export enum DocumentType {
  ID_DOCUMENT = 'ID_DOCUMENT',
  EMPLOYMENT_LETTER = 'EMPLOYMENT_LETTER',
  PAY_STUB = 'PAY_STUB',
  BANK_STATEMENT = 'BANK_STATEMENT',
  OTHER = 'OTHER',
}
