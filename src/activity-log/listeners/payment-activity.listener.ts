import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType } from '../../common/enums/index.js';
import {
  PaymentReceiptUploadedEvent,
  PaymentValidatedEvent,
  PaymentDisputeOpenedEvent,
} from '../../notifications/events/payment.events.js';

/**
 * Listener for payment-related events.
 * Creates activity log entries for both tenant and landlord
 * when payment receipts are uploaded, validated, or disputed.
 */
@Injectable()
export class PaymentActivityListener {
  private readonly logger = new Logger(PaymentActivityListener.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Handle payment.receiptUploaded event.
   * Create activity entries for both tenant (who uploaded) and landlord (who receives).
   */
  @OnEvent('payment.receiptUploaded')
  async handleReceiptUploaded(
    event: PaymentReceiptUploadedEvent,
  ): Promise<void> {
    try {
      // Entry for tenant (actor is the tenant who uploaded)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.tenantId,
        type: ActivityType.PAYMENT_REQUEST_SUBMITTED,
        resourceType: 'payment_request',
        resourceId: event.paymentRequestId,
        metadata: {
          leaseId: event.leaseId,
          amount: event.amount,
          propertyTitle: event.propertyTitle,
        },
      });

      // Entry for landlord (actor is the tenant)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.tenantId,
        type: ActivityType.PAYMENT_REQUEST_SUBMITTED,
        resourceType: 'payment_request',
        resourceId: event.paymentRequestId,
        metadata: {
          leaseId: event.leaseId,
          amount: event.amount,
          propertyTitle: event.propertyTitle,
          tenantName: event.tenantName,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de comprobante de pago: ${event.paymentRequestId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle payment.validated event.
   * Create activity entries for both tenant and landlord when payment is approved/rejected.
   */
  @OnEvent('payment.validated')
  async handlePaymentValidated(event: PaymentValidatedEvent): Promise<void> {
    try {
      const activityType = event.approved
        ? ActivityType.PAYMENT_REQUEST_APPROVED
        : ActivityType.PAYMENT_REQUEST_REJECTED;

      // Entry for tenant (landlord validated)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.landlordId,
        type: activityType,
        resourceType: 'payment_request',
        resourceId: event.paymentRequestId,
        metadata: {
          leaseId: event.leaseId,
          amount: event.amount,
          approved: event.approved,
          propertyTitle: event.propertyTitle,
        },
      });

      // Entry for landlord (landlord is also the actor)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.landlordId,
        type: activityType,
        resourceType: 'payment_request',
        resourceId: event.paymentRequestId,
        metadata: {
          leaseId: event.leaseId,
          amount: event.amount,
          approved: event.approved,
          propertyTitle: event.propertyTitle,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de validacion de pago: ${event.paymentRequestId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle payment.disputeOpened event.
   * Create activity entries for both tenant (who disputed) and landlord.
   */
  @OnEvent('payment.disputeOpened')
  async handleDisputeOpened(event: PaymentDisputeOpenedEvent): Promise<void> {
    try {
      // Entry for tenant (actor is the tenant who opened dispute)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.tenantId,
        type: ActivityType.PAYMENT_DISPUTE_OPENED,
        resourceType: 'dispute',
        resourceId: event.disputeId,
        metadata: {
          leaseId: event.leaseId,
          paymentRequestId: event.paymentRequestId,
          amount: event.amount,
          propertyTitle: event.propertyTitle,
        },
      });

      // Entry for landlord (actor is the tenant)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.tenantId,
        type: ActivityType.PAYMENT_DISPUTE_OPENED,
        resourceType: 'dispute',
        resourceId: event.disputeId,
        metadata: {
          leaseId: event.leaseId,
          paymentRequestId: event.paymentRequestId,
          amount: event.amount,
          propertyTitle: event.propertyTitle,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de disputa de pago: ${event.disputeId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
