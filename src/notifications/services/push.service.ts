import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Result of a push notification send attempt
 */
export interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Push notification payload
 */
export interface PushPayload {
  token: string; // FCM device token
  title: string;
  body: string;
  data?: Record<string, string>; // Optional custom data
}

/**
 * PushService
 *
 * Handles push notification delivery via Firebase Cloud Messaging.
 * Used by NotificationsProcessor to send push notifications.
 *
 * Features:
 * - Firebase Admin SDK integration
 * - Single device token messaging
 * - Error handling with detailed logging
 * - Returns success/failure status for logging
 *
 * Note: FCM tokens are stored in User.fcmToken field.
 * Frontend apps must register their FCM token after login.
 */
@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private initialized = false;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    // Initialize Firebase Admin only if not already initialized
    if (admin.apps.length === 0) {
      const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
      const privateKeyRaw = this.config.get<string>('FIREBASE_PRIVATE_KEY');
      const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');

      if (!projectId || !privateKeyRaw || !clientEmail) {
        this.logger.warn(
          'Firebase config not set — push notifications disabled',
        );
        return;
      }

      try {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey,
            clientEmail,
          }),
        });

        this.initialized = true;
        this.logger.log(`PushService initialized for project: ${projectId}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to initialize Firebase: ${message}`);
      }
    } else {
      this.initialized = true;
      this.logger.log('PushService using existing Firebase app');
    }
  }

  /**
   * Send a push notification via FCM.
   *
   * @param payload - Push details (token, title, body, data)
   * @returns PushResult with success status and messageId or error
   */
  async send(payload: PushPayload): Promise<PushResult> {
    const { token, title, body, data } = payload;

    if (!this.initialized) {
      this.logger.warn('Push service not initialized, skipping notification');
      return {
        success: false,
        error: 'Firebase not initialized',
      };
    }

    if (!token) {
      this.logger.warn('No FCM token provided, skipping push');
      return {
        success: false,
        error: 'No FCM token',
      };
    }

    this.logger.debug(
      `Sending push to token ${token.substring(0, 20)}...: "${title}"`,
    );

    try {
      const message: admin.messaging.Message = {
        token,
        notification: {
          title,
          body,
        },
        data: data || {},
        // Android specific
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        // iOS specific
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);

      this.logger.log(`Push sent, messageId: ${messageId}`);
      return {
        success: true,
        messageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Check for invalid token errors
      if (
        message.includes('not a valid FCM registration token') ||
        message.includes('Requested entity was not found')
      ) {
        this.logger.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
        return {
          success: false,
          error: 'Invalid FCM token',
        };
      }

      this.logger.error(`Failed to send push: ${message}`);
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Send push notification to multiple tokens.
   * Returns results for each token.
   */
  async sendMultiple(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<PushResult[]> {
    const results = await Promise.all(
      tokens.map((token) => this.send({ token, title, body, data })),
    );
    return results;
  }
}
