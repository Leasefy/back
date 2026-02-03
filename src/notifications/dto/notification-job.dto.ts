import type { TemplateVariables } from '../services/template.service.js';

/**
 * Job data for notification queue
 */
export interface NotificationJobData {
  /** User ID to send notification to */
  userId: string;

  /** Template code (e.g., 'APPLICATION_RECEIVED') */
  templateCode: string;

  /** Variables for template substitution */
  variables: TemplateVariables;

  /** Source that triggered the notification */
  triggeredBy?: string;
}
