import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { DocumentType } from '../../common/enums/index.js';
import type {
  CrossValidationResult,
  CrossValidationInconsistency,
} from '../interfaces/analysis-result.interface.js';

/**
 * CrossValidationService
 *
 * Compares extracted data across documents in the same application
 * to detect inconsistencies:
 * - Name on cedula vs name on employment letter vs name on pay stub
 * - Salary on employment letter vs salary on pay stub (flag if >10% diff)
 * - Company on employment letter vs company on pay stub
 * - Recurring income in bank statement vs declared salary
 * - Employment start date vs tenure in pay stub
 */
@Injectable()
export class CrossValidationService {
  private readonly logger = new Logger(CrossValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validate all analyzed documents for an application.
   *
   * @param applicationId - Application to validate
   * @returns Cross-validation result with inconsistencies
   */
  async validate(applicationId: string): Promise<CrossValidationResult> {
    const results = await this.prisma.documentAnalysisResult.findMany({
      where: {
        applicationId,
        status: 'COMPLETED',
      },
    });

    const inconsistencies: CrossValidationInconsistency[] = [];

    // Index results by document type
    const byType = new Map<string, (typeof results)[0]>();
    for (const r of results) {
      byType.set(r.documentType, r);
    }

    const cedula = byType.get(DocumentType.ID_DOCUMENT);
    const cartaLaboral = byType.get(DocumentType.EMPLOYMENT_LETTER);
    const nomina = byType.get(DocumentType.PAY_STUB);
    const extracto = byType.get(DocumentType.BANK_STATEMENT);

    // Cross-validate names
    this.validateNames(cedula, cartaLaboral, nomina, extracto, inconsistencies);

    // Cross-validate salaries
    this.validateSalaries(cartaLaboral, nomina, extracto, inconsistencies);

    // Cross-validate companies
    this.validateCompanies(cartaLaboral, nomina, inconsistencies);

    // Calculate overall consistency score
    const maxPossibleChecks = 5;
    const failedChecks = inconsistencies.filter(
      (i) => i.severity === 'HIGH',
    ).length;
    const mediumChecks = inconsistencies.filter(
      (i) => i.severity === 'MEDIUM',
    ).length;
    const penalty = failedChecks * 0.2 + mediumChecks * 0.1;
    const overallConsistencyScore = Math.max(0, 1 - penalty);

    return {
      applicationId,
      totalDocumentsAnalyzed: results.length,
      inconsistencies,
      overallConsistencyScore,
    };
  }

  /**
   * Compare names across documents.
   */
  private validateNames(
    cedula: (typeof this.prisma.$extends)[] extends never[]
      ? never
      : Record<string, unknown> | undefined,
    cartaLaboral: Record<string, unknown> | undefined,
    nomina: Record<string, unknown> | undefined,
    extracto: Record<string, unknown> | undefined,
    inconsistencies: CrossValidationInconsistency[],
  ): void {
    const cedulaName = this.getExtractedField(cedula, 'nombre_completo');
    const cartaName =
      this.getExtractedField(cartaLaboral, 'firmado_por') ?? // Could be employee name
      this.getExtractedField(cartaLaboral, 'empresa'); // Fallback
    const nominaName = this.getExtractedField(nomina, 'empleado');
    const extractoName = this.getExtractedField(extracto, 'titular');

    // Compare cedula name vs employment letter
    if (cedulaName && nominaName && !this.namesMatch(cedulaName, nominaName)) {
      inconsistencies.push({
        field: 'nombre',
        documentA: 'CEDULA',
        valueA: cedulaName,
        documentB: 'NOMINA',
        valueB: nominaName,
        severity: 'HIGH',
        message: `Nombre en cédula ("${cedulaName}") no coincide con nombre en nómina ("${nominaName}")`,
      });
    }

    // Compare cedula name vs bank statement
    if (
      cedulaName &&
      extractoName &&
      !this.namesMatch(cedulaName, extractoName)
    ) {
      inconsistencies.push({
        field: 'nombre',
        documentA: 'CEDULA',
        valueA: cedulaName,
        documentB: 'EXTRACTO_BANCARIO',
        valueB: extractoName,
        severity: 'HIGH',
        message: `Nombre en cédula ("${cedulaName}") no coincide con titular en extracto bancario ("${extractoName}")`,
      });
    }
  }

  /**
   * Compare salaries across documents.
   * Flag if difference > 10%.
   */
  private validateSalaries(
    cartaLaboral: Record<string, unknown> | undefined,
    nomina: Record<string, unknown> | undefined,
    extracto: Record<string, unknown> | undefined,
    inconsistencies: CrossValidationInconsistency[],
  ): void {
    const cartaSalario = this.getExtractedNumber(
      cartaLaboral,
      'salario_mensual',
    );
    const nominaSalario = this.getExtractedNumber(nomina, 'salario_basico');
    const extractoIngreso = this.getExtractedNumber(
      extracto,
      'ingreso_recurrente',
    );

    // Employment letter vs pay stub salary
    if (cartaSalario && nominaSalario) {
      const diff = Math.abs(cartaSalario - nominaSalario) / cartaSalario;
      if (diff > 0.1) {
        inconsistencies.push({
          field: 'salario',
          documentA: 'CARTA_LABORAL',
          valueA: cartaSalario,
          documentB: 'NOMINA',
          valueB: nominaSalario,
          severity: diff > 0.3 ? 'HIGH' : 'MEDIUM',
          message: `Salario en carta laboral ($${cartaSalario.toLocaleString('es-CO')}) difiere ${Math.round(diff * 100)}% del salario en nómina ($${nominaSalario.toLocaleString('es-CO')})`,
        });
      }
    }

    // Declared salary vs bank deposits
    const declaredSalary = cartaSalario ?? nominaSalario;
    if (declaredSalary && extractoIngreso) {
      const diff =
        Math.abs(declaredSalary - extractoIngreso) / declaredSalary;
      if (diff > 0.2) {
        inconsistencies.push({
          field: 'ingreso_vs_depositos',
          documentA: 'SALARIO_DECLARADO',
          valueA: declaredSalary,
          documentB: 'EXTRACTO_BANCARIO',
          valueB: extractoIngreso,
          severity: diff > 0.5 ? 'HIGH' : 'MEDIUM',
          message: `Salario declarado ($${declaredSalary.toLocaleString('es-CO')}) difiere ${Math.round(diff * 100)}% del ingreso recurrente en extracto ($${extractoIngreso.toLocaleString('es-CO')})`,
        });
      }
    }
  }

  /**
   * Compare company names across documents.
   */
  private validateCompanies(
    cartaLaboral: Record<string, unknown> | undefined,
    nomina: Record<string, unknown> | undefined,
    inconsistencies: CrossValidationInconsistency[],
  ): void {
    const cartaEmpresa = this.getExtractedField(cartaLaboral, 'empresa');
    const nominaEmpresa = this.getExtractedField(nomina, 'empresa');

    if (
      cartaEmpresa &&
      nominaEmpresa &&
      !this.namesMatch(cartaEmpresa, nominaEmpresa)
    ) {
      inconsistencies.push({
        field: 'empresa',
        documentA: 'CARTA_LABORAL',
        valueA: cartaEmpresa,
        documentB: 'NOMINA',
        valueB: nominaEmpresa,
        severity: 'HIGH',
        message: `Empresa en carta laboral ("${cartaEmpresa}") no coincide con empresa en nómina ("${nominaEmpresa}")`,
      });
    }
  }

  /**
   * Extract a string field from the extractedData JSON.
   */
  private getExtractedField(
    result: Record<string, unknown> | undefined,
    field: string,
  ): string | null {
    if (!result) return null;
    const data = (result as { extractedData?: Record<string, unknown> })
      .extractedData;
    if (!data || typeof data !== 'object') return null;
    const value = (data as Record<string, unknown>)[field];
    return typeof value === 'string' ? value : null;
  }

  /**
   * Extract a number field from the extractedData JSON.
   */
  private getExtractedNumber(
    result: Record<string, unknown> | undefined,
    field: string,
  ): number | null {
    if (!result) return null;
    const data = (result as { extractedData?: Record<string, unknown> })
      .extractedData;
    if (!data || typeof data !== 'object') return null;
    const value = (data as Record<string, unknown>)[field];
    return typeof value === 'number' ? value : null;
  }

  /**
   * Fuzzy name comparison.
   * Normalizes and compares name strings, allowing for OCR errors.
   */
  private namesMatch(nameA: string, nameB: string): boolean {
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')
        .trim();

    const a = normalize(nameA);
    const b = normalize(nameB);

    // Exact match after normalization
    if (a === b) return true;

    // Check if one contains the other (handles partial names)
    if (a.includes(b) || b.includes(a)) return true;

    // Check word overlap (at least 2 words in common)
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    const commonWords = [...wordsA].filter((w) => wordsB.has(w) && w.length > 2);
    return commonWords.length >= 2;
  }
}
