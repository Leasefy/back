import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Result of an email send attempt
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email payload for sending
 */
export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text fallback
}

/**
 * EmailService
 *
 * Handles email delivery via Resend API.
 * Used by NotificationsProcessor to send notification emails.
 *
 * Features:
 * - Resend API integration
 * - Error handling with detailed logging
 * - Returns success/failure status for logging
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null = null;
  private fromAddress!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set — email notifications disabled');
      return;
    }

    this.resend = new Resend(apiKey);
    this.fromAddress =
      this.config.get<string>('EMAIL_FROM_ADDRESS') ||
      'Arriendo Facil <notificaciones@arriendofacil.co>';

    this.logger.log(`EmailService initialized with from: ${this.fromAddress}`);
  }

  /**
   * Send an email via Resend.
   *
   * @param payload - Email details (to, subject, html, text)
   * @returns EmailResult with success status and messageId or error
   */
  async send(payload: EmailPayload): Promise<EmailResult> {
    const { to, subject, html, text } = payload;

    if (!this.resend) {
      this.logger.warn('Email service not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    this.logger.debug(`Sending email to ${to}: "${subject}"`);

    try {
      const response = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      // Resend returns { data: { id }, error: null } on success
      if (response.error) {
        this.logger.error(`Resend error for ${to}: ${response.error.message}`);
        return {
          success: false,
          error: response.error.message,
        };
      }

      this.logger.log(`Email sent to ${to}, messageId: ${response.data?.id}`);
      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Strip HTML tags to create plain text fallback.
   * Simple implementation - just removes tags.
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}
