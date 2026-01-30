import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScoringJobData } from './dto/scoring-job.dto.js';

/**
 * ScoringService
 *
 * Service for triggering risk score calculations.
 * Adds scoring jobs to the BullMQ queue for async processing.
 */
@Injectable()
export class ScoringService {
  constructor(
    @InjectQueue('scoring') private readonly scoringQueue: Queue<ScoringJobData>,
  ) {}

  /**
   * Add a scoring job to the queue.
   * Called when an application is submitted.
   *
   * @param applicationId - ID of the application to score
   * @param triggeredBy - User ID who triggered the scoring
   */
  async addScoringJob(applicationId: string, triggeredBy: string): Promise<void> {
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
}
