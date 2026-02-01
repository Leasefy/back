import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  displayHeaderFooter?: boolean;
  headerTemplate?: string;
  footerTemplate?: string;
}

const DEFAULT_OPTIONS: PdfOptions = {
  format: 'A4',
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm',
  },
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size:10px;text-align:center;width:100%;color:#888;">
      Contrato de Arrendamiento
    </div>
  `,
  footerTemplate: `
    <div style="font-size:10px;text-align:center;width:100%;color:#888;">
      <span class="pageNumber"></span> de <span class="totalPages"></span>
    </div>
  `,
};

/**
 * PdfGeneratorService
 *
 * Generates PDF documents from HTML using Puppeteer.
 * Uploads signed contract PDFs to Supabase Storage.
 *
 * Browser instance is reused for performance (startup is slow).
 *
 * Requirements: CONT-09
 */
@Injectable()
export class PdfGeneratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: Browser | null = null;
  private supabase: SupabaseClient;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow<string>('SUPABASE_URL'),
      this.configService.getOrThrow<string>('SUPABASE_SERVICE_KEY'),
    );
  }

  async onModuleInit() {
    // Lazy initialization - browser started on first use
    this.logger.log('PdfGeneratorService initialized');
  }

  async onModuleDestroy() {
    if (this.browser) {
      this.logger.log('Closing Puppeteer browser...');
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Generate a PDF buffer from HTML content.
   * Uses Puppeteer to render HTML and convert to PDF.
   */
  async generatePdf(html: string, options?: PdfOptions): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set content and wait for rendering
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Merge options with defaults
      const pdfOptions = { ...DEFAULT_OPTIONS, ...options };

      // Generate PDF
      const pdf = await page.pdf({
        format: pdfOptions.format,
        margin: pdfOptions.margin,
        printBackground: true,
        displayHeaderFooter: pdfOptions.displayHeaderFooter,
        headerTemplate: pdfOptions.headerTemplate,
        footerTemplate: pdfOptions.footerTemplate,
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate PDF from contract HTML and upload to Supabase Storage.
   * Returns the storage path for the PDF.
   *
   * Requirements: CONT-09
   */
  async generateContractPdf(
    contractId: string,
    contractHtml: string,
  ): Promise<string> {
    const pdfBuffer = await this.generatePdf(contractHtml);

    // Upload to Supabase Storage
    const storagePath = `contracts/${contractId}/contract-signed.pdf`;
    const { error } = await this.supabase.storage
      .from('contracts')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload PDF: ${error.message}`);
    }

    this.logger.log(`PDF generated and uploaded: ${storagePath}`);
    return storagePath;
  }

  /**
   * Get signed URL for a contract PDF.
   * Returns URL with 1-hour expiry.
   *
   * Requirements: CONT-09
   */
  async getSignedPdfUrl(storagePath: string): Promise<{ url: string; expiresAt: Date }> {
    const { data, error } = await this.supabase.storage
      .from('contracts')
      .createSignedUrl(storagePath, 3600); // 1 hour

    if (error || !data) {
      throw new Error(`Failed to create signed URL: ${error?.message}`);
    }

    const expiresAt = new Date(Date.now() + 3600 * 1000);
    return { url: data.signedUrl, expiresAt };
  }

  /**
   * Get or create the browser instance.
   * Reuses the same browser for efficiency.
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.logger.log('Launching Puppeteer browser...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
      this.logger.log('Puppeteer browser launched');
    }
    return this.browser;
  }
}
