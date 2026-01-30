import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScoringService } from './scoring.service.js';

/**
 * ScoringController
 *
 * Endpoints for accessing risk score results.
 * Used for testing and will be expanded in Phase 6 for landlord features.
 */
@ApiTags('scoring')
@ApiBearerAuth()
@Controller('scoring')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  /**
   * Get the risk score result for an application.
   * Returns 404 if scoring hasn't completed yet.
   */
  @Get(':applicationId')
  @ApiOperation({ summary: 'Get risk score result for an application' })
  @ApiResponse({ status: 200, description: 'Score result found' })
  @ApiResponse({ status: 404, description: 'Score not found (scoring may still be in progress)' })
  async getScore(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    const result = await this.scoringService.getScoreResult(applicationId);

    if (!result) {
      throw new NotFoundException(
        'Score not found. Scoring may still be in progress or application was never submitted.',
      );
    }

    return {
      applicationId: result.applicationId,
      totalScore: result.totalScore,
      level: result.level,
      categories: {
        financial: result.financialScore,
        stability: result.stabilityScore,
        history: result.historyScore,
        integrity: result.integrityScore,
      },
      drivers: result.drivers,
      flags: result.flags,
      conditions: result.conditions,
      algorithmVersion: result.algorithmVersion,
      createdAt: result.createdAt,
    };
  }
}
