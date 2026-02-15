import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { DriverFormatterService } from './driver-formatter.service.js';
import { NarrativeGeneratorService } from './narrative-generator.service.js';
import { TemplateGeneratorService } from './template-generator.service.js';
import type { RiskScoreResultData, Driver, Flag, Condition } from '../aggregator/risk-score-result.interface.js';
import { RiskLevel } from '../../common/enums/index.js';
import type { Signal } from '../models/model-result.interface.js';
import {
  ExplainabilityResponseDto,
  SubscoreDto,
  DriverExplanationDto,
} from './dto/index.js';
import type { RiskScoreResult, Application } from '@prisma/client';

/**
 * ExplainabilityService
 *
 * Orchestrates explainability generation:
 * - Formats drivers with metadata
 * - Generates AI narratives (with template fallback)
 * - Caches narratives in database
 * - Returns complete explainability responses
 */
@Injectable()
export class ExplainabilityService {
  private readonly logger = new Logger(ExplainabilityService.name);

  constructor(
    private readonly driverFormatter: DriverFormatterService,
    private readonly narrativeGenerator: NarrativeGeneratorService,
    private readonly templateGenerator: TemplateGeneratorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get complete explanation for a score result.
   *
   * @param scoreResult - RiskScoreResult from Prisma
   * @param application - Application from Prisma (for context)
   * @returns Complete explainability response
   */
  async getExplanation(
    scoreResult: RiskScoreResult,
    application: Application,
  ): Promise<ExplainabilityResponseDto> {
    // Cast JSON fields from Prisma
    const signals = scoreResult.signals as unknown as Signal[];
    const drivers = scoreResult.drivers as unknown as Driver[];
    const flags = scoreResult.flags as unknown as Flag[];
    const conditions = scoreResult.conditions as unknown as Condition[];

    // Build RiskScoreResultData for internal use
    const resultData: RiskScoreResultData = {
      total: scoreResult.totalScore,
      level: scoreResult.level as RiskLevel,
      categories: {
        financial: scoreResult.financialScore,
        stability: scoreResult.stabilityScore,
        history: scoreResult.historyScore,
        integrity: scoreResult.integrityScore,
        paymentHistory: scoreResult.paymentHistoryScore,
      },
      drivers,
      flags,
      conditions,
    };

    // Format drivers with metadata
    const formattedDrivers = this.driverFormatter.format(
      drivers,
      signals,
      resultData,
    );

    // Build subscores (only 5 fields exist in DB)
    const subscores = this.buildSubscores(scoreResult);

    // Get or generate narrative
    let narrative: string;
    let isPremium = false;

    if (scoreResult.explanation) {
      // Use cached narrative
      this.logger.debug(
        `Using cached narrative for score result ${scoreResult.id}`,
      );
      narrative = scoreResult.explanation;
      isPremium = true; // Assume cached narratives are from AI
    } else {
      // Try AI generation, fallback to template
      try {
        this.logger.debug('Attempting AI narrative generation...');
        narrative = await this.narrativeGenerator.generate(
          resultData,
          formattedDrivers,
        );
        isPremium = true;

        // Cache the generated narrative (fire and forget)
        this.cacheNarrative(scoreResult.id, narrative).catch((error) => {
          this.logger.error('Failed to cache narrative:', error);
        });
      } catch (error) {
        this.logger.warn(
          'AI narrative generation failed, using template fallback',
          error,
        );
        narrative = this.templateGenerator.generate(
          resultData,
          formattedDrivers,
        );
        isPremium = false;
      }
    }

    // Build response DTO
    return {
      totalScore: resultData.total,
      level: resultData.level,
      narrative,
      drivers: formattedDrivers,
      flags,
      conditions,
      subscores,
      algorithmVersion: scoreResult.algorithmVersion,
      isPremium,
    };
  }

  /**
   * Generate and cache a narrative for a score result.
   * Used for background processing or pre-generation.
   *
   * @param riskScoreResultId - ID of the RiskScoreResult
   */
  async generateAndCacheNarrative(riskScoreResultId: string): Promise<void> {
    this.logger.debug(`Generating narrative for result ${riskScoreResultId}`);

    // Load score result with relations
    const scoreResult = await this.prisma.riskScoreResult.findUnique({
      where: { id: riskScoreResultId },
      include: { application: true },
    });

    if (!scoreResult) {
      throw new Error(`RiskScoreResult ${riskScoreResultId} not found`);
    }

    // Cast JSON fields
    const signals = scoreResult.signals as unknown as Signal[];
    const drivers = scoreResult.drivers as unknown as Driver[];
    const flags = scoreResult.flags as unknown as Flag[];
    const conditions = scoreResult.conditions as unknown as Condition[];

    // Build result data
    const resultData: RiskScoreResultData = {
      total: scoreResult.totalScore,
      level: scoreResult.level as RiskLevel,
      categories: {
        financial: scoreResult.financialScore,
        stability: scoreResult.stabilityScore,
        history: scoreResult.historyScore,
        integrity: scoreResult.integrityScore,
        paymentHistory: scoreResult.paymentHistoryScore,
      },
      drivers,
      flags,
      conditions,
    };

    // Format drivers
    const formattedDrivers = this.driverFormatter.format(
      drivers,
      signals,
      resultData,
    );

    // Generate narrative
    const narrative = await this.narrativeGenerator.generate(
      resultData,
      formattedDrivers,
    );

    // Save to database
    await this.cacheNarrative(riskScoreResultId, narrative);

    this.logger.log(
      `Narrative generated and cached for result ${riskScoreResultId}`,
    );
  }

  /**
   * Build subscore breakdown from Prisma model.
   *
   * @param scoreResult - RiskScoreResult from Prisma
   * @returns Array of subscores with labels
   */
  private buildSubscores(scoreResult: RiskScoreResult): SubscoreDto[] {
    return [
      {
        category: 'financial',
        score: scoreResult.financialScore,
        maxScore: 35,
        label: 'Situación Financiera',
      },
      {
        category: 'stability',
        score: scoreResult.stabilityScore,
        maxScore: 25,
        label: 'Estabilidad Laboral',
      },
      {
        category: 'history',
        score: scoreResult.historyScore,
        maxScore: 15,
        label: 'Historial de Referencias',
      },
      {
        category: 'integrity',
        score: scoreResult.integrityScore,
        maxScore: 25,
        label: 'Integridad de Datos',
      },
      {
        category: 'paymentHistory',
        score: scoreResult.paymentHistoryScore,
        maxScore: 15,
        label: 'Historial de Pagos',
      },
    ];
  }

  /**
   * Cache a narrative in the database.
   *
   * @param riskScoreResultId - ID of the RiskScoreResult
   * @param narrative - Generated narrative to cache
   */
  private async cacheNarrative(
    riskScoreResultId: string,
    narrative: string,
  ): Promise<void> {
    await this.prisma.riskScoreResult.update({
      where: { id: riskScoreResultId },
      data: { explanation: narrative },
    });
  }
}
