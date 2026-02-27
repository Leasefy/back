import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { DocumentType } from '../../common/enums/index.js';
import { OcrService } from './ocr.service.js';
import { CohereService } from './cohere.service.js';
import { buildAnalysisPrompt } from '../prompts/system-prompt.js';
import { CEDULA_PROMPT } from '../prompts/cedula.prompt.js';
import { EMPLOYMENT_LETTER_PROMPT } from '../prompts/employment-letter.prompt.js';
import { PAY_STUB_PROMPT } from '../prompts/pay-stub.prompt.js';
import { BANK_STATEMENT_PROMPT } from '../prompts/bank-statement.prompt.js';
import type { DocumentAnalysisOutput } from '../interfaces/analysis-result.interface.js';

/**
 * DocumentAnalyzerService
 *
 * Orchestrates the full document analysis pipeline:
 * 1. Download file from Supabase Storage
 * 2. OCR: Extract text (pdf-parse or Tesseract.js)
 * 3. Select prompt based on DocumentType
 * 4. Send text to Cohere for analysis
 * 5. Parse JSON response
 * 6. Save DocumentAnalysisResult to DB
 */
@Injectable()
export class DocumentAnalyzerService {
  private readonly logger = new Logger(DocumentAnalyzerService.name);
  private supabase: SupabaseClient;
  private readonly BUCKET_NAME = 'application-documents';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ocrService: OcrService,
    private readonly cohereService: CohereService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  /**
   * Analyze a single document.
   *
   * @param documentId - ApplicationDocument ID
   * @param applicationId - Application ID (for indexing)
   * @param documentType - Type of document (for prompt selection)
   */
  async analyzeDocument(
    documentId: string,
    applicationId: string,
    documentType: DocumentType,
  ): Promise<void> {
    const startTime = Date.now();

    // Mark as PROCESSING
    const existingResult = await this.prisma.documentAnalysisResult.findUnique({
      where: { documentId },
    });

    if (existingResult) {
      await this.prisma.documentAnalysisResult.update({
        where: { documentId },
        data: { status: 'PROCESSING' },
      });
    } else {
      await this.prisma.documentAnalysisResult.create({
        data: {
          documentId,
          applicationId,
          documentType,
          extractedData: {} as unknown as Prisma.InputJsonValue,
          modelUsed: this.configService.get('AI_MODEL') ?? 'command-r-plus',
          status: 'PROCESSING',
        },
      });
    }

    try {
      // 1. Get document record
      const document = await this.prisma.applicationDocument.findUniqueOrThrow({
        where: { id: documentId },
      });

      // 2. Download from Supabase Storage
      const { data: fileData, error: downloadError } =
        await this.supabase.storage
          .from(this.BUCKET_NAME)
          .download(document.storagePath);

      if (downloadError || !fileData) {
        throw new BadRequestException(
          `Failed to download document: ${downloadError?.message}`,
        );
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      // 3. OCR: Extract text
      const ocrResult = await this.ocrService.extractText(
        buffer,
        document.mimeType,
      );

      if (!ocrResult.text || ocrResult.text.length < 10) {
        throw new Error(
          'OCR extraction yielded insufficient text. Document may be blank or unreadable.',
        );
      }

      // 4. Select prompt based on document type
      const documentPrompt = this.getPromptForType(documentType);

      // 5. Build full prompt and send to Cohere
      const fullPrompt = buildAnalysisPrompt(documentPrompt, ocrResult.text);
      const cohereResult = await this.cohereService.analyze(
        fullPrompt,
        ocrResult.text,
      );

      // 6. Parse JSON response
      const analysisOutput = this.parseAnalysisOutput(cohereResult.content);

      // 7. Save result to DB
      const processingTimeMs = Date.now() - startTime;

      await this.prisma.documentAnalysisResult.update({
        where: { documentId },
        data: {
          extractedData:
            analysisOutput.datos_extraidos as unknown as Prisma.InputJsonValue,
          confidence: ocrResult.confidence,
          scoreFinal: analysisOutput.score_final,
          nivelRiesgo: analysisOutput.nivel_riesgo,
          justificacion: analysisOutput.justificacion,
          recomendacion: analysisOutput.recomendacion,
          inconsistencies: (analysisOutput.inconsistencias ??
            []) as unknown as Prisma.InputJsonValue,
          flags: (analysisOutput.flags ??
            []) as unknown as Prisma.InputJsonValue,
          ocrText: ocrResult.text,
          ocrConfidence: ocrResult.confidence,
          tokensUsed: cohereResult.tokensUsed,
          processingTimeMs,
          status: 'COMPLETED',
          errorMessage: null,
        },
      });

      this.logger.log(
        `Document ${documentId} analyzed: score=${analysisOutput.score_final}, ` +
          `risk=${analysisOutput.nivel_riesgo}, time=${processingTimeMs}ms`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      await this.prisma.documentAnalysisResult.update({
        where: { documentId },
        data: {
          status: 'FAILED',
          errorMessage,
          processingTimeMs: Date.now() - startTime,
        },
      });

      this.logger.error(
        `Document analysis failed for ${documentId}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Get the prompt template for a given document type.
   */
  private getPromptForType(type: DocumentType): string {
    switch (type) {
      case DocumentType.ID_DOCUMENT:
        return CEDULA_PROMPT;
      case DocumentType.EMPLOYMENT_LETTER:
        return EMPLOYMENT_LETTER_PROMPT;
      case DocumentType.PAY_STUB:
        return PAY_STUB_PROMPT;
      case DocumentType.BANK_STATEMENT:
        return BANK_STATEMENT_PROMPT;
      default:
        return `Tipo de documento: OTRO
Analiza el documento y extrae toda la información relevante que puedas identificar.
Devuelve un JSON con datos_extraidos, score_final (0-100), nivel_riesgo, justificacion, recomendacion.`;
    }
  }

  /**
   * Parse the AI response into structured output.
   * Handles potential JSON parsing issues.
   */
  private parseAnalysisOutput(content: string): DocumentAnalysisOutput {
    try {
      const parsed = JSON.parse(content) as DocumentAnalysisOutput;

      // Validate required fields with defaults
      return {
        datos_extraidos: parsed.datos_extraidos ?? {},
        score_final: Math.max(
          0,
          Math.min(100, Math.round(parsed.score_final ?? 0)),
        ),
        nivel_riesgo: parsed.nivel_riesgo ?? 'ALTO',
        justificacion: parsed.justificacion ?? 'No se pudo generar justificación',
        recomendacion: parsed.recomendacion ?? 'Verificar manualmente',
        inconsistencias: parsed.inconsistencias ?? [],
        flags: parsed.flags ?? [],
      };
    } catch {
      this.logger.warn('Failed to parse Cohere JSON response, using fallback');
      return {
        datos_extraidos: {},
        score_final: 0,
        nivel_riesgo: 'ALTO',
        justificacion: 'Error al analizar la respuesta del modelo de IA',
        recomendacion: 'Verificar el documento manualmente',
        inconsistencias: [],
        flags: ['AI_PARSE_ERROR'],
      };
    }
  }
}
