import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

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
 * Handles email delivery via Brevo (formerly Sendinblue) SMTP relay.
 * Used by NotificationsProcessor to send notification emails.
 *
 * Env vars required:
 * - BREVO_SMTP_USER: SMTP login (e.g. a2a941001@smtp-brevo.com)
 * - BREVO_SMTP_PASS: API key (xkeysib-...)
 * - EMAIL_FROM_ADDRESS: Verified sender (e.g. "Leasefy <spacewolf1902@gmail.com>")
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;
  private fromAddress!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const smtpUser = this.config.get<string>('BREVO_SMTP_USER');
    const smtpPass = this.config.get<string>('BREVO_SMTP_PASS');

    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        'BREVO_SMTP_USER/BREVO_SMTP_PASS not set — email notifications disabled',
      );
      return;
    }

    this.transporter = createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.fromAddress =
      this.config.get<string>('EMAIL_FROM_ADDRESS') ||
      'Leasefy <spacewolf1902@gmail.com>';

    this.logger.log(`EmailService initialized (Brevo SMTP) with from: ${this.fromAddress}`);
  }

  /**
   * Send an email via Brevo SMTP.
   *
   * @param payload - Email details (to, subject, html, text)
   * @returns EmailResult with success status and messageId or error
   */
  async send(payload: EmailPayload): Promise<EmailResult> {
    const { to, subject, html, text } = payload;

    if (!this.transporter) {
      this.logger.warn('Email service not configured, skipping email');
      return { success: false, error: 'Email service not configured' };
    }

    this.logger.debug(`Sending email to ${to}: "${subject}"`);

    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      });

      this.logger.log(`Email sent to ${to}, messageId: ${info.messageId}`);
      return {
        success: true,
        messageId: info.messageId,
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
   * Send an agency invitation email with the invitation link.
   *
   * @param to - Recipient email address
   * @param agencyName - Name of the inviting agency
   * @param role - Role assigned to the invitee
   * @param token - Invitation token
   * @param expiresAt - Token expiry date
   * @returns EmailResult — never throws; failures are logged and returned
   */
  async sendAgencyInvitationEmail(
    to: string,
    agencyName: string,
    role: string,
    token: string,
    expiresAt: Date,
  ): Promise<EmailResult> {
    const frontendUrl =
      process.env['FRONTEND_URL'] || 'http://localhost:3001';
    const invitationLink = `${frontendUrl}/invitacion/${token}`;
    const expiryText = expiresAt.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a2e;">Has sido invitado a unirte a ${agencyName}</h2>
        <p>Hola,</p>
        <p>
          <strong>${agencyName}</strong> te ha invitado a unirte como
          <strong>${role}</strong> en la plataforma Leasefy.
        </p>
        <p>
          <a
            href="${invitationLink}"
            style="
              display: inline-block;
              background-color: #4f46e5;
              color: #ffffff;
              padding: 12px 24px;
              border-radius: 6px;
              text-decoration: none;
              font-weight: bold;
              margin: 16px 0;
            "
          >
            Aceptar invitación
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Este enlace expira el <strong>${expiryText}</strong>.
          Si no deseas unirte, puedes ignorar este correo.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
          <a href="${invitationLink}" style="color: #4f46e5;">${invitationLink}</a>
        </p>
      </div>
    `;

    return this.send({ to, subject: `Invitación para unirte a ${agencyName}`, html });
  }

  /**
   * Strip HTML tags to create plain text fallback.
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
