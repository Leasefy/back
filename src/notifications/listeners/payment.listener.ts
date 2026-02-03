import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service.js';
import {
  PaymentReceiptUploadedEvent,
  PaymentValidatedEvent,
  PaymentDisputeOpenedEvent,
} from '../events/payment.events.js';

/**
 * Listener for payment-related events.
 * Sends notifications for receipt uploads, validations, and disputes.
 */
@Injectable()
export class PaymentNotificationListener {
  private readonly logger = new Logger(PaymentNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle payment.receiptUploaded event.
   * Notify landlord of new payment receipt.
   */
  @OnEvent('payment.receiptUploaded')
  async handleReceiptUploaded(event: PaymentReceiptUploadedEvent): Promise<void> {
    this.logger.log(`Payment receipt uploaded: ${event.paymentRequestId}`);

    await this.notificationsService.send({
      userId: event.landlordId,
      templateCode: 'PAYMENT_RECEIPT_UPLOADED',
      variables: {
        propertyTitle: event.propertyTitle,
        propertyAddress: event.propertyAddress,
        otherPartyName: event.tenantName,
        amount: this.formatCurrency(event.amount),
        date: this.formatDate(new Date()),
      },
      triggeredBy: `payment:${event.paymentRequestId}`,
    });
  }

  /**
   * Handle payment.validated event.
   * Notify tenant of approval/rejection.
   */
  @OnEvent('payment.validated')
  async handlePaymentValidated(event: PaymentValidatedEvent): Promise<void> {
    this.logger.log(
      `Payment validated: ${event.paymentRequestId}, approved: ${event.approved}`,
    );

    const templateCode = event.approved ? 'PAYMENT_APPROVED' : 'PAYMENT_REJECTED';

    await this.notificationsService.send({
      userId: event.tenantId,
      templateCode,
      variables: {
        propertyTitle: event.propertyTitle,
        otherPartyName: event.landlordName,
        amount: this.formatCurrency(event.amount),
        date: this.formatDate(new Date()),
      },
      triggeredBy: `payment:${event.paymentRequestId}`,
    });
  }

  /**
   * Handle payment.disputeOpened event.
   * Notify landlord of dispute.
   */
  @OnEvent('payment.disputeOpened')
  async handleDisputeOpened(event: PaymentDisputeOpenedEvent): Promise<void> {
    this.logger.log(`Payment dispute opened: ${event.disputeId}`);

    await this.notificationsService.send({
      userId: event.landlordId,
      templateCode: 'PAYMENT_DISPUTE_OPENED',
      variables: {
        propertyTitle: event.propertyTitle,
        otherPartyName: event.tenantName,
        amount: this.formatCurrency(event.amount),
        date: this.formatDate(new Date()),
      },
      triggeredBy: `dispute:${event.disputeId}`,
    });
  }

  /**
   * Format amount as Colombian peso.
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format date in Spanish.
   */
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
