import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DocumentAnalyzerService } from '../services/document-analyzer.service.js';
import type { DocumentAnalysisJobData } from '../interfaces/analysis-result.interface.js';

/**
 * DocumentAnalysisProcessor
 *
 * BullMQ worker that processes document analysis jobs asynchronously.
 * Each job analyzes one document: OCR → Cohere AI → save result.
 *
 * Retries up to 3 times with exponential backoff on failure.
 */
@Processor('document-analysis', {
  drainDelay: 300_000,       // 5min entre polls cuando la cola esta vacia (on-demand)
  stalledInterval: 600_000,  // 10min check de stalled jobs
})
export class DocumentAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(DocumentAnalysisProcessor.name);

  constructor(
    private readonly documentAnalyzer: DocumentAnalyzerService,
  ) {
    super();
  }

  /**
   * Process a document analysis job.
   */
  async process(job: Job<DocumentAnalysisJobData>): Promise<void> {
    const { documentId, applicationId, documentType } = job.data;

    this.logger.log(
      `Processing document analysis job ${job.id}: ` +
        `doc=${documentId}, type=${documentType}`,
    );

    await this.documentAnalyzer.analyzeDocument(
      documentId,
      applicationId,
      documentType,
    );

    this.logger.log(
      `Document analysis completed for job ${job.id}: doc=${documentId}`,
    );
  }

  /**
   * Handle failed jobs.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<DocumentAnalysisJobData>, error: Error): void {
    this.logger.error(
      `Document analysis job ${job.id} failed for document ${job.data.documentId}: ${error.message}`,
      error.stack,
    );
  }
}
