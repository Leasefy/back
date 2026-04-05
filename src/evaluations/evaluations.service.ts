import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PrismaService } from '../database/prisma.service.js';
import { AgentCreditsService } from '../agent-credits/agent-credits.service.js';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service.js';
import { AgentMicroClient } from './agent-micro.client.js';
import type { Prisma } from '@prisma/client';
import type {
  TenantScoringPayload,
  TenantScoringDocumentType,
} from './dto/index.js';
import type { EvaluationResponseDto } from './dto/index.js';

const DOCUMENTS_BUCKET = 'application-documents';
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Maps backend DocumentType enum values to the micro's accepted types.
 * Only 3 types are supported by the micro. Other backend types return null
 * and are filtered out before sending the payload.
 */
function mapDocumentType(
  backendType: string,
): TenantScoringDocumentType | null {
  switch (backendType) {
    case 'ID_DOCUMENT':
      return 'cedula';
    case 'BANK_STATEMENT':
      return 'extracto_bancario';
    case 'EMPLOYMENT_LETTER':
      return 'contrato_laboral';
    default:
      // PAY_STUB, INCOME_PROOF, CREDIT_REPORT, OTHER → not supported by micro (Phase 7+)
      return null;
  }
}

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);
  private readonly supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly agentCreditsService: AgentCreditsService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly agentMicroClient: AgentMicroClient,
    private readonly configService: ConfigService,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_KEY')!,
    );
  }

  async requestEvaluation(
    applicationId: string,
    requestedBy: string,
    userAccessToken: string,
  ): Promise<{ runId: string; status: string }> {
    if (!userAccessToken) {
      throw new UnauthorizedException(
        'Token de autenticacion requerido para solicitar evaluaciones',
      );
    }

    // 1. Load application + verify ownership
    const application = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { property: true, documents: true },
    });

    if (application.property.landlordId !== requestedBy) {
      throw new ForbiddenException('No tenes acceso a esta solicitud');
    }

    // 2. Idempotency: return existing if PENDING or COMPLETED
    const existing = await this.prisma.evaluationResult.findUnique({
      where: { applicationId },
    });

    if (existing && existing.status !== 'FAILED') {
      return { runId: existing.runId, status: existing.status };
    }

    // 3. If FAILED, delete old result so @unique allows new creation
    if (existing && existing.status === 'FAILED') {
      await this.prisma.evaluationResult.delete({
        where: { applicationId },
      });
    }

    // 4. Validate plan + charge credits
    const chargeResult = await this.validateAndCharge(
      requestedBy,
      applicationId,
    );

    // 5. Build payload (async — generates signed URLs and resolves agency) and call micro
    const payload = await this.buildMicroPayload(application, requestedBy);
    const { runId } = await this.agentMicroClient.startEvaluation(
      payload,
      userAccessToken,
    );

    // 6. Persist EvaluationResult + EvaluationTransaction atomically
    await this.prisma.$transaction(async (tx) => {
      const evalResult = await tx.evaluationResult.create({
        data: { applicationId, requestedBy, runId, status: 'PENDING' },
      });

      await tx.evaluationTransaction.create({
        data: {
          evaluationId: evalResult.id,
          userId: requestedBy,
          tier: chargeResult.tier,
          amountPaidCop: chargeResult.amountPaidCop,
          creditsDeducted: chargeResult.creditsDeducted,
        },
      });
    });

    // 7. Increment PRO monthly counter
    if (chargeResult.tier === 'PRO') {
      const newCount = await this.incrementEvaluationCount(requestedBy);
      if (newCount > 30) {
        this.logger.warn(
          `PRO user ${requestedBy} exceeded 30 eval limit: ${newCount}`,
        );
      }
    }

    this.logger.log(
      `Evaluation started: application=${applicationId} runId=${runId} tier=${chargeResult.tier}`,
    );

    return { runId, status: 'PENDING' };
  }

  async getResult(
    applicationId: string,
    userId: string,
    userAccessToken: string,
  ): Promise<EvaluationResponseDto> {
    const evaluation = await this.prisma.evaluationResult.findUnique({
      where: { applicationId },
      include: { application: { include: { property: true } } },
    });

    if (!evaluation) {
      throw new NotFoundException(
        'No se encontro evaluacion para esta solicitud',
      );
    }

    if (evaluation.application.property.landlordId !== userId) {
      throw new ForbiddenException('No tenes acceso a esta evaluacion');
    }

    // If PENDING, attempt to poll micro for result
    if (evaluation.status === 'PENDING' && userAccessToken) {
      try {
        const microResult = await this.agentMicroClient.pollResult(
          evaluation.runId,
          userAccessToken,
        );

        if (microResult) {
          const updated = await this.prisma.evaluationResult.update({
            where: { id: evaluation.id },
            data: {
              status: 'COMPLETED',
              result: microResult as Prisma.InputJsonValue,
            },
          });
          return this.toResponseDto(updated);
        }
      } catch (err) {
        this.logger.warn(
          `Poll failed for runId=${evaluation.runId}: ${(err as Error).message}`,
        );
      }
    }

    return this.toResponseDto(evaluation);
  }

  private async validateAndCharge(
    userId: string,
    applicationId: string,
  ): Promise<{
    tier: string;
    amountPaidCop: number;
    creditsDeducted: number;
  }> {
    // 1. Check active subscription
    const subscription =
      await this.subscriptionsService.getActiveSubscription(userId);

    if (!subscription) {
      throw new ForbiddenException(
        'Se requiere una suscripcion activa para solicitar evaluaciones',
      );
    }

    const planConfig = subscription.plan;
    const tier = planConfig.tier;

    // 2. PRO monthly limit check
    if (tier === 'PRO') {
      const count = await this.getMonthlyEvaluationCount(userId);
      if (count >= 30) {
        throw new HttpException(
          'Limite de 30 evaluaciones mensuales alcanzado',
          429,
        );
      }
    }

    // 3. FLEX: free, skip credit deduction
    if (tier === 'FLEX') {
      return { tier: 'FLEX', amountPaidCop: 0, creditsDeducted: 0 };
    }

    // 4. STARTER/PRO: deduct 1 credit
    const deducted = await this.agentCreditsService.deductCredits(
      userId,
      1,
      applicationId,
    );

    if (!deducted) {
      throw new BadRequestException(
        'Saldo de creditos insuficiente. Compra mas creditos para continuar.',
      );
    }

    return {
      tier,
      amountPaidCop: planConfig.evaluationCreditPrice,
      creditsDeducted: 1,
    };
  }

  private async incrementEvaluationCount(userId: string): Promise<number> {
    const now = new Date();
    const usage = await this.prisma.evaluationUsage.upsert({
      where: {
        userId_month_year_eval: {
          userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
      create: {
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        count: 1,
      },
      update: { count: { increment: 1 } },
    });
    return usage.count;
  }

  private async getMonthlyEvaluationCount(userId: string): Promise<number> {
    const now = new Date();
    const usage = await this.prisma.evaluationUsage.findUnique({
      where: {
        userId_month_year_eval: {
          userId,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });
    return usage?.count ?? 0;
  }

  /**
   * Builds the payload for the agent microservice POST /tenant-scoring.
   *
   * Responsibilities:
   * - Extract monthlyRent from the associated Property
   * - Resolve agencyId from landlord's active AgencyMember (optional — omitted if none)
   * - Filter documents to only the 3 types the micro accepts
   * - Generate Supabase signed URLs (1h TTL) for each supported document
   * - Throw BadRequestException if no supported documents exist
   */
  private async buildMicroPayload(
    application: {
      id: string;
      tenantId: string;
      property: { monthlyRent: number };
      documents: Array<{ type: string; storagePath: string }>;
    },
    landlordUserId: string,
  ): Promise<TenantScoringPayload> {
    // Filter + map documents to the 3 types accepted by the micro
    const supportedDocs = application.documents
      .map((d) => ({
        storagePath: d.storagePath,
        mappedType: mapDocumentType(d.type),
      }))
      .filter(
        (d): d is { storagePath: string; mappedType: TenantScoringDocumentType } =>
          d.mappedType !== null,
      );

    if (supportedDocs.length === 0) {
      throw new BadRequestException(
        'La solicitud debe tener al menos un documento soportado (cedula, extracto bancario, o carta laboral) para poder evaluarla.',
      );
    }

    // Generate signed URLs for each supported document
    const signedDocs = await Promise.all(
      supportedDocs.map(async (d) => {
        const { data, error } = await this.supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(d.storagePath, SIGNED_URL_EXPIRY_SECONDS);

        if (error || !data) {
          this.logger.error(
            `Failed to create signed URL for ${d.storagePath}: ${error?.message}`,
          );
          throw new BadRequestException(
            `No se pudo generar URL firmada para documento: ${d.storagePath}`,
          );
        }

        return { url: data.signedUrl, type: d.mappedType };
      }),
    );

    // Resolve agencyId from landlord's active AgencyMember (optional)
    const agencyMember = await this.prisma.agencyMember.findFirst({
      where: { userId: landlordUserId, status: 'ACTIVE' },
      select: { agencyId: true },
    });

    const payload: TenantScoringPayload = {
      applicationId: application.id,
      tenantId: application.tenantId,
      monthlyRent: application.property.monthlyRent,
      documents: signedDocs,
      language: 'es',
    };

    // Only include agencyId if landlord is member of an agency
    if (agencyMember) {
      payload.agencyId = agencyMember.agencyId;
    }

    return payload;
  }

  private toResponseDto(evaluation: {
    runId: string;
    status: string;
    result: unknown;
    error: string | null;
    createdAt: Date;
  }): EvaluationResponseDto {
    return {
      runId: evaluation.runId,
      status: evaluation.status,
      result: evaluation.result ?? undefined,
      error: evaluation.error ?? undefined,
      createdAt: evaluation.createdAt,
    };
  }
}
