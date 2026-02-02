import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PseMockService } from './pse-mock.service.js';
import { TenantPaymentsService } from '../tenant-payments.service.js';
import { PseMockRequestDto, PseMockResponseDto } from './dto/index.js';
import { Public } from '../../auth/decorators/public.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Role } from '../../common/enums/index.js';

/**
 * PseMockController
 *
 * Endpoints for PSE (Pagos Seguros en Linea) mock payment processing.
 * Simulates the PSE flow without external integration.
 *
 * Requirements: TPAY-04, TPAY-07, TPAY-08
 */
@ApiTags('PSE Mock')
@Controller('pse-mock')
export class PseMockController {
  constructor(
    private readonly pseMockService: PseMockService,
    private readonly tenantPaymentsService: TenantPaymentsService,
  ) {}

  /**
   * TPAY-07: Get list of banks for PSE.
   *
   * Returns all Colombian banks available for PSE payments.
   * Public endpoint - no authentication required.
   */
  @Get('banks')
  @Public()
  @ApiOperation({ summary: 'Get list of banks available for PSE payments' })
  @ApiResponse({
    status: 200,
    description: 'List of Colombian banks',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string', example: 'BANCOLOMBIA' },
          name: { type: 'string', example: 'Bancolombia' },
        },
      },
    },
  })
  getBanks(): Array<{ code: string; name: string }> {
    return this.pseMockService.getAvailableBanks();
  }

  /**
   * TPAY-04, TPAY-08: Process PSE mock payment.
   *
   * Simulates PSE payment processing.
   * - If SUCCESS: creates payment request with PSE transaction ID
   * - If FAILURE: returns error message, no payment request created
   * - If PENDING: returns pending status, no payment request created
   *
   * Result is deterministic based on document number last digit:
   * - 0: Insufficient funds
   * - 1: Bank rejection
   * - 9: Pending verification
   * - Others: Success
   */
  @Post('process')
  @Roles(Role.TENANT, Role.BOTH)
  @ApiOperation({ summary: 'Process PSE mock payment' })
  @ApiResponse({
    status: 201,
    description: 'Payment processed',
    type: PseMockResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 403,
    description: 'Not tenant of this lease',
  })
  @ApiResponse({
    status: 409,
    description: 'Duplicate payment for period',
  })
  async processPayment(
    @Body() dto: PseMockRequestDto,
    @CurrentUser() user: { id: string },
  ): Promise<PseMockResponseDto> {
    // 1. Process PSE mock (deterministic based on document)
    const result = this.pseMockService.processPayment(dto);

    // 2. If SUCCESS, create payment request
    if (result.status === 'SUCCESS') {
      const paymentRequest = await this.tenantPaymentsService.createFromPse(
        user.id,
        dto.leaseId,
        {
          amount: dto.amount,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
          pseTransactionId: result.transactionId,
          pseBankCode: dto.bankCode,
        },
      );
      return { ...result, paymentRequestId: paymentRequest.id };
    }

    // 3. FAILURE or PENDING - return result without payment request
    return result;
  }
}
