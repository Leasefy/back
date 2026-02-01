import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScoringService } from './scoring.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';

/**
 * ScoringController
 *
 * Endpoints for accessing risk score results.
 * Accessible by: tenant who owns the application OR landlord who owns the property.
 */
@ApiTags('scoring')
@ApiBearerAuth()
@Controller('scoring')
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get the risk score result for an application.
   * Only accessible by the tenant owner or the property landlord.
   */
  @Get(':applicationId')
  @ApiOperation({ summary: 'Get risk score result for an application' })
  @ApiResponse({ status: 200, description: 'Score result found' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this score' })
  @ApiResponse({ status: 404, description: 'Score not found (scoring may still be in progress)' })
  async getScore(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    // Fetch application with property to check permissions
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { landlordId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check permissions: must be tenant owner OR property landlord
    const isTenantOwner = application.tenantId === user.id;
    const isLandlord = application.property.landlordId === user.id;

    if (!isTenantOwner && !isLandlord) {
      throw new ForbiddenException(
        'You do not have permission to view this score. Only the applicant or property owner can access it.',
      );
    }

    // Get the score result
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
