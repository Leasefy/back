import {
  Controller,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service.js';
import { CrossValidationService } from './services/cross-validation.service.js';
import { DocumentAnalyzerService } from './services/document-analyzer.service.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Role, DocumentType } from '../common/enums/index.js';

/**
 * AiController
 *
 * REST endpoints for AI document analysis.
 * All endpoints require LANDLORD role and PRO/BUSINESS subscription.
 * Analysis runs on-demand (no BullMQ queue, no Redis polling).
 */
@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly crossValidationService: CrossValidationService,
    private readonly documentAnalyzer: DocumentAnalyzerService,
  ) {}

  /**
   * POST /ai/analyze/:applicationId
   *
   * Trigger AI analysis of ALL documents for an application.
   * Returns immediately — documents are processed in background.
   * Poll GET /ai/analysis/:applicationId to check progress.
   */
  @Post('analyze/:applicationId')
  @Roles(Role.LANDLORD, Role.ADMIN)
  async analyzeApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Subscription gating
    await this.enforceSubscription(userId);

    // Verify application exists and user is the landlord
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: { select: { landlordId: true } },
        documents: true,
      },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (application.property.landlordId !== userId) {
      throw new ForbiddenException(
        'You can only analyze documents for your own properties',
      );
    }

    if (application.documents.length === 0) {
      throw new NotFoundException(
        'No documents found for this application',
      );
    }

    // Pre-create PENDING records so GET endpoint shows status immediately
    for (const doc of application.documents) {
      const existing = await this.prisma.documentAnalysisResult.findUnique({
        where: { documentId: doc.id },
      });
      if (existing) {
        await this.prisma.documentAnalysisResult.update({
          where: { documentId: doc.id },
          data: { status: 'PENDING', errorMessage: null },
        });
      } else {
        await this.prisma.documentAnalysisResult.create({
          data: {
            documentId: doc.id,
            applicationId,
            documentType: doc.type,
            extractedData: {},
            modelUsed: 'command-r-plus',
            status: 'PENDING',
          },
        });
      }
    }

    // Fire-and-forget: process in background without blocking HTTP response
    this.processDocumentsInBackground(application.documents, applicationId);

    const documentIds = application.documents.map((d) => d.id);

    return {
      message: `Análisis iniciado para ${application.documents.length} documento(s)`,
      applicationId,
      totalDocuments: application.documents.length,
      documentIds,
      status: 'PROCESSING',
    };
  }

  /**
   * Process documents sequentially in the background.
   * Fire-and-forget — errors are caught per document (already saved to DB by DocumentAnalyzerService).
   */
  private processDocumentsInBackground(
    documents: Array<{ id: string; type: string }>,
    applicationId: string,
  ): void {
    void (async () => {
      for (const doc of documents) {
        try {
          await this.documentAnalyzer.analyzeDocument(
            doc.id,
            applicationId,
            doc.type as unknown as DocumentType,
          );
        } catch (err) {
          this.logger.error(
            `Background analysis failed for document ${doc.id}: ${(err as Error).message}`,
          );
        }
      }
      this.logger.log(
        `Background analysis completed for application ${applicationId}`,
      );
    })();
  }

  /**
   * POST /ai/analyze/document/:documentId
   *
   * Analyze a single document directly.
   */
  @Post('analyze/document/:documentId')
  @Roles(Role.LANDLORD, Role.ADMIN)
  async analyzeDocument(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.enforceSubscription(userId);

    const document = await this.prisma.applicationDocument.findUnique({
      where: { id: documentId },
      include: {
        application: {
          include: { property: { select: { landlordId: true } } },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document ${documentId} not found`);
    }

    if (document.application.property.landlordId !== userId) {
      throw new ForbiddenException(
        'You can only analyze documents for your own properties',
      );
    }

    await this.documentAnalyzer.analyzeDocument(
      documentId,
      document.applicationId,
      document.type as unknown as DocumentType,
    );

    return {
      message: 'Análisis completado para el documento',
      documentId,
    };
  }

  /**
   * GET /ai/analysis/:applicationId
   *
   * Get analysis results for all documents in an application.
   * Includes cross-validation if multiple documents are analyzed.
   */
  @Get('analysis/:applicationId')
  @Roles(Role.LANDLORD, Role.ADMIN)
  async getAnalysisResults(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
  ) {
    // Verify ownership
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { property: { select: { landlordId: true } } },
    });

    if (!application) {
      throw new NotFoundException(`Application ${applicationId} not found`);
    }

    if (application.property.landlordId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const results = await this.prisma.documentAnalysisResult.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });

    // Run cross-validation if we have multiple completed results
    const completedResults = results.filter((r) => r.status === 'COMPLETED');
    let crossValidation = null;
    if (completedResults.length >= 2) {
      crossValidation =
        await this.crossValidationService.validate(applicationId);
    }

    return {
      applicationId,
      results,
      crossValidation,
      summary: {
        total: results.length,
        completed: completedResults.length,
        processing: results.filter((r) => r.status === 'PROCESSING').length,
        failed: results.filter((r) => r.status === 'FAILED').length,
        pending: results.filter((r) => r.status === 'PENDING').length,
        averageScore: completedResults.length > 0
          ? Math.round(
              completedResults.reduce(
                (sum, r) => sum + (r.scoreFinal ?? 0),
                0,
              ) / completedResults.length,
            )
          : null,
      },
    };
  }

  /**
   * GET /ai/analysis/document/:documentId
   *
   * Get analysis result for a specific document.
   */
  @Get('analysis/document/:documentId')
  @Roles(Role.LANDLORD, Role.ADMIN)
  async getDocumentAnalysis(
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.prisma.documentAnalysisResult.findUnique({
      where: { documentId },
      include: {
        document: {
          include: {
            application: {
              include: { property: { select: { landlordId: true } } },
            },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException(
        `No analysis found for document ${documentId}`,
      );
    }

    if (result.document.application.property.landlordId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return result;
  }

  /**
   * Verify user has PRO or BUSINESS subscription.
   */
  private async enforceSubscription(userId: string): Promise<void> {
    const planConfig =
      await this.subscriptionsService.getUserPlanConfig(userId);

    if (planConfig.tier === 'STARTER') {
      throw new ForbiddenException(
        'AI Document Analysis requiere plan PRO o FLEX. Actualiza tu suscripción para acceder a esta funcionalidad.',
      );
    }
  }
}
