import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { ColombianBank, BANK_DISPLAY_NAMES } from '../../common/enums/index.js';
import type { PseMockRequestDto } from './dto/pse-mock-request.dto.js';
import type { PseMockResponseDto } from './dto/pse-mock-response.dto.js';

/**
 * PseMockService
 *
 * Simulates PSE (Pagos Seguros en Linea) payment processing.
 * Uses deterministic results based on document number for testing.
 *
 * Requirements: TPAY-07, TPAY-08
 */
@Injectable()
export class PseMockService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get list of banks available for PSE.
   * Returns all Colombian banks with their codes and display names.
   *
   * Requirement: TPAY-07
   */
  getAvailableBanks(): Array<{ code: string; name: string }> {
    return Object.values(ColombianBank).map((code) => ({
      code,
      name: BANK_DISPLAY_NAMES[code],
    }));
  }

  /**
   * Process PSE mock payment.
   *
   * Uses document number last digit for deterministic results:
   * - 0: FAILURE (Fondos insuficientes)
   * - 1: FAILURE (Transaccion rechazada por el banco)
   * - 9: PENDING (Pendiente de verificacion bancaria)
   * - Others: SUCCESS
   *
   * This allows frontend testing of different payment scenarios.
   *
   * Requirement: TPAY-08
   */
  processPayment(
    dto: PseMockRequestDto,
  ): Omit<PseMockResponseDto, 'paymentRequestId'> {
    // Generate unique transaction ID
    const transactionId = `PSE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const lastDigit = dto.documentNumber.slice(-1);
    const bankName = BANK_DISPLAY_NAMES[dto.bankCode];
    const timestamp = new Date();

    // Document ending in 0: Insufficient funds
    if (lastDigit === '0') {
      return {
        transactionId,
        status: 'FAILURE',
        message: 'Fondos insuficientes en la cuenta bancaria',
        bankName,
        timestamp,
      };
    }

    // Document ending in 1: Bank rejection
    if (lastDigit === '1') {
      return {
        transactionId,
        status: 'FAILURE',
        message: 'Transaccion rechazada por el banco',
        bankName,
        timestamp,
      };
    }

    // Document ending in 9: Pending verification
    if (lastDigit === '9') {
      return {
        transactionId,
        status: 'PENDING',
        message: 'Transaccion pendiente de verificacion bancaria',
        bankName,
        timestamp,
      };
    }

    // All other cases: Success
    return {
      transactionId,
      status: 'SUCCESS',
      message: 'Pago procesado exitosamente',
      bankName,
      timestamp,
    };
  }
}
