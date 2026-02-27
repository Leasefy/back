import { Injectable, Logger } from '@nestjs/common';
import type { OcrResult } from '../interfaces/analysis-result.interface.js';

/**
 * OcrService
 *
 * Extracts text from documents using:
 * - pdf-parse for native PDFs (fast, no OCR needed)
 * - Tesseract.js for scanned PDFs and images (OCR)
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Extract text from a document buffer.
   *
   * Strategy:
   * 1. If PDF → try pdf-parse first (native text extraction)
   * 2. If pdf-parse yields little text → fall back to Tesseract OCR
   * 3. If image → use Tesseract OCR directly
   */
  async extractText(buffer: Buffer, mimeType: string): Promise<OcrResult> {
    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(buffer);
    }

    // Image types: jpeg, png, webp
    return this.extractFromImage(buffer);
  }

  /**
   * Extract text from PDF.
   * Uses pdf-parse for native text; falls back to Tesseract if text is too short.
   */
  private async extractFromPdf(buffer: Buffer): Promise<OcrResult> {
    try {
      // Dynamic import for ESM compatibility
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      const text = result.text?.trim() ?? '';

      // If we got meaningful text from native extraction, use it
      if (text.length > 50) {
        this.logger.debug(
          `PDF native text extraction: ${text.length} chars`,
        );
        return { text, confidence: 0.95 };
      }

      // Scanned PDF - fall back to OCR on rendered pages
      this.logger.debug('PDF has minimal text, falling back to OCR');
      return this.extractFromImage(buffer);
    } catch (error) {
      this.logger.warn(`pdf-parse failed, falling back to OCR: ${error}`);
      return this.extractFromImage(buffer);
    }
  }

  /**
   * Extract text from image using Tesseract.js OCR.
   */
  private async extractFromImage(buffer: Buffer): Promise<OcrResult> {
    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker('spa');

    try {
      const {
        data: { text, confidence },
      } = await worker.recognize(buffer);

      this.logger.debug(
        `Tesseract OCR: ${text.length} chars, confidence: ${confidence}%`,
      );

      return {
        text: text.trim(),
        confidence: confidence / 100, // Convert to 0-1 range
      };
    } finally {
      await worker.terminate();
    }
  }
}
