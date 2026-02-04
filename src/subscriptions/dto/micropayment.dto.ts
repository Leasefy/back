import { PseSubscriptionPaymentDto } from './subscription-payment.dto.js';

/**
 * DTO for micropayment (extra scoring view purchase).
 * Uses the same PSE payment fields.
 */
export class MicropaymentDto extends PseSubscriptionPaymentDto {}
