import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { marked } from 'marked';
import { PrismaService } from '../../database/prisma.service.js';
import type { NotificationTemplate } from '@prisma/client';

/**
 * Variables available for template substitution
 */
export interface TemplateVariables {
  userName?: string;
  userEmail?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  amount?: string;        // Formatted currency string
  date?: string;          // Formatted date string
  otherPartyName?: string;
  // Additional context-specific variables
  [key: string]: string | undefined;
}

/**
 * Rendered template ready for sending
 */
export interface RenderedTemplate {
  emailSubject: string;
  emailHtml: string;
  pushTitle: string;
  pushBody: string;
}

/**
 * TemplateService
 *
 * Handles notification template loading and rendering:
 * - Loads templates from database by code
 * - Substitutes {{variables}} with actual values
 * - Converts Markdown email body to HTML
 *
 * Template variables:
 * - {{userName}}: Recipient's name
 * - {{userEmail}}: Recipient's email
 * - {{propertyTitle}}: Property title
 * - {{propertyAddress}}: Property address
 * - {{amount}}: Formatted currency (e.g., "$1,500,000")
 * - {{date}}: Formatted date (e.g., "15 de febrero, 2026")
 * - {{otherPartyName}}: Name of the other party
 */
@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private readonly prisma: PrismaService) {
    // Configure marked for safe HTML output
    marked.setOptions({
      gfm: true,       // GitHub Flavored Markdown
      breaks: true,    // Convert \n to <br>
    });
  }

  /**
   * Load and render a template by code.
   *
   * @param code - Template code (e.g., 'APPLICATION_RECEIVED')
   * @param variables - Values to substitute in template
   * @returns Rendered template with HTML email body
   * @throws NotFoundException if template not found or inactive
   */
  async render(code: string, variables: TemplateVariables): Promise<RenderedTemplate> {
    // Load template from database
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`Notification template not found: ${code}`);
    }

    if (!template.isActive) {
      throw new NotFoundException(`Notification template is disabled: ${code}`);
    }

    // Substitute variables in all template fields
    const emailSubject = this.substituteVariables(template.emailSubject, variables);
    const emailMarkdown = this.substituteVariables(template.emailBody, variables);
    const pushTitle = this.substituteVariables(template.pushTitle, variables);
    const pushBody = this.substituteVariables(template.pushBody, variables);

    // Convert Markdown to HTML for email
    const emailHtml = this.wrapInEmailLayout(await marked.parse(emailMarkdown));

    this.logger.debug(`Rendered template ${code} for ${variables.userName || 'user'}`);

    return {
      emailSubject,
      emailHtml,
      pushTitle,
      pushBody,
    };
  }

  /**
   * Substitute {{variable}} placeholders with values.
   * Missing variables are replaced with empty string.
   */
  private substituteVariables(text: string, variables: TemplateVariables): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      if (value === undefined) {
        this.logger.warn(`Template variable not provided: ${key}`);
        return '';
      }
      return value;
    });
  }

  /**
   * Wrap rendered HTML in email layout with branding.
   */
  private wrapInEmailLayout(content: string): string {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Arriendo Facil</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e0e0e0;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    a {
      color: #667eea;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 10px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Arriendo Facil</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>Este es un correo automatico de Arriendo Facil.</p>
    <p>Si no deseas recibir estos correos, puedes desactivar las notificaciones en tu perfil.</p>
    <p>&copy; 2026 Arriendo Facil. Todos los derechos reservados.</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Get all active template codes (for validation).
   */
  async getActiveCodes(): Promise<string[]> {
    const templates = await this.prisma.notificationTemplate.findMany({
      where: { isActive: true },
      select: { code: true },
    });
    return templates.map((t) => t.code);
  }
}
