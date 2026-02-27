import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CohereClientV2 } from 'cohere-ai';
import type { CohereAnalysisResult } from '../interfaces/analysis-result.interface.js';

/**
 * CohereService
 *
 * Wrapper around Cohere SDK for document analysis.
 * Uses Command R+ model with JSON response format.
 */
@Injectable()
export class CohereService implements OnModuleInit {
  private readonly logger = new Logger(CohereService.name);
  private client!: CohereClientV2;
  private model!: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.configService.get<string>('COHERE_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'COHERE_API_KEY not configured - AI document analysis will be unavailable',
      );
      return;
    }

    this.client = new CohereClientV2({ token: apiKey });
    this.model = this.configService.get<string>('AI_MODEL') ?? 'command-r-plus';
    this.logger.log(`Cohere service initialized with model: ${this.model}`);
  }

  /**
   * Analyze document text using Cohere.
   *
   * @param systemPrompt - Combined system + document-specific prompt
   * @param ocrText - The OCR-extracted text to analyze
   * @returns Analysis content and token usage
   */
  async analyze(
    systemPrompt: string,
    ocrText: string,
  ): Promise<CohereAnalysisResult> {
    if (!this.client) {
      throw new Error(
        'Cohere client not initialized. Check COHERE_API_KEY configuration.',
      );
    }

    const response = await this.client.chat({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: ocrText },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.1,
    });

    const content =
      response.message?.content?.[0]?.type === 'text'
        ? response.message.content[0].text
        : '';

    const tokensUsed =
      (response.usage?.tokens?.inputTokens ?? 0) +
      (response.usage?.tokens?.outputTokens ?? 0);

    return { content, tokensUsed };
  }
}
