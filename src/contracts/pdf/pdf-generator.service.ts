import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

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

@Injectable()
export class PdfGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private browser: Browser | null = null;

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

  /**
   * Close the browser when the module is destroyed.
   * Prevents memory leaks.
   */
  async onModuleDestroy() {
    if (this.browser) {
      this.logger.log('Closing Puppeteer browser...');
      await this.browser.close();
      this.browser = null;
    }
  }
}
