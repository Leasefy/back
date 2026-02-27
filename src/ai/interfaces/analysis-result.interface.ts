import { DocumentType } from '../../common/enums/index.js';

/**
 * Raw data extracted from a document by OCR + AI analysis.
 * Shape depends on document type.
 */
export interface CedulaExtractedData {
  nombre_completo: string | null;
  numero_cedula: string | null;
  fecha_nacimiento: string | null;
  fecha_expedicion: string | null;
  lugar_expedicion: string | null;
  sexo: string | null;
  rh: string | null;
}

export interface EmploymentLetterExtractedData {
  empresa: string | null;
  nit: string | null;
  cargo: string | null;
  salario_mensual: number | null;
  fecha_ingreso: string | null;
  tipo_contrato: string | null;
  antiguedad_meses: number | null;
  firmado_por: string | null;
  tiene_membrete: boolean | null;
  tiene_firma: boolean | null;
}

export interface PayStubExtractedData {
  empresa: string | null;
  empleado: string | null;
  periodo: string | null;
  salario_basico: number | null;
  total_devengado: number | null;
  total_deducciones: number | null;
  neto_pagar: number | null;
}

export interface BankStatementExtractedData {
  banco: string | null;
  tipo_cuenta: string | null;
  titular: string | null;
  periodo: string | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  total_ingresos: number | null;
  ingreso_recurrente: number | null;
  patron_ingresos: string | null;
}

export type ExtractedData =
  | CedulaExtractedData
  | EmploymentLetterExtractedData
  | PayStubExtractedData
  | BankStatementExtractedData
  | Record<string, unknown>;

/**
 * Result from AI document analysis.
 */
export interface DocumentAnalysisOutput {
  datos_extraidos: ExtractedData;
  score_final: number;
  nivel_riesgo: 'BAJO' | 'MEDIO' | 'ALTO';
  justificacion: string;
  recomendacion: string;
  inconsistencias?: string[];
  flags?: string[];
}

/**
 * OCR extraction result.
 */
export interface OcrResult {
  text: string;
  confidence: number;
}

/**
 * Cohere analysis result.
 */
export interface CohereAnalysisResult {
  content: string;
  tokensUsed: number;
}

/**
 * Cross-validation inconsistency found between documents.
 */
export interface CrossValidationInconsistency {
  field: string;
  documentA: string;
  valueA: string | number | null;
  documentB: string;
  valueB: string | number | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
}

/**
 * Result of cross-validating all documents for an application.
 */
export interface CrossValidationResult {
  applicationId: string;
  totalDocumentsAnalyzed: number;
  inconsistencies: CrossValidationInconsistency[];
  overallConsistencyScore: number; // 0.0-1.0
}

/**
 * Job data for BullMQ document analysis queue.
 */
export interface DocumentAnalysisJobData {
  documentId: string;
  applicationId: string;
  documentType: DocumentType;
  triggeredBy: string;
}
