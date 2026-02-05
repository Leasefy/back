import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringJobData } from './dto/scoring-job.dto.js';
import { PrismaService } from '../database/prisma.service.js';
import { RiskScoreResult } from '@prisma/client';

/**
 * ScoringService
 *
 * Service for triggering risk score calculations.
 * Adds scoring jobs to the BullMQ queue for async processing.
 */
@Injectable()
export class ScoringService {
  constructor(
    @InjectQueue('scoring')
    private readonly scoringQueue: Queue<ScoringJobData>,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Add a scoring job to the queue.
   * Called when an application is submitted.
   *
   * @param applicationId - ID of the application to score
   * @param triggeredBy - User ID who triggered the scoring
   */
  async addScoringJob(
    applicationId: string,
    triggeredBy: string,
  ): Promise<void> {
    await this.scoringQueue.add(
      'score-application',
      {
        applicationId,
        triggeredBy,
        triggeredAt: new Date().toISOString(),
      } as ScoringJobData,
      {
        // Prevent duplicate scoring jobs for the same application
        jobId: `score-${applicationId}`,
      },
    );
  }

  /**
   * Get the risk score result for an application.
   * Returns null if scoring hasn't completed yet.
   *
   * @param applicationId - ID of the application
   */
  async getScoreResult(applicationId: string): Promise<RiskScoreResult | null> {
    return this.prisma.riskScoreResult.findUnique({
      where: { applicationId },
    });
  }
}
