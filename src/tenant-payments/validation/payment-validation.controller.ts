import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { User, TenantPaymentRequest, Payment } from '@prisma/client';
import { CurrentUser, Roles } from '../../auth/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { PaymentValidationService } from './payment-validation.service.js';
import { RejectPaymentDto } from './dto/index.js';

/**
 * Controller for landlord payment validation.
 * Allows landlords to view, approve, or reject tenant payment requests.
 *
 * All endpoints require LANDLORD or BOTH role.
 *
 * Requirement: TPAY-10
 */
@ApiTags('Payment Validation')
@ApiBearerAuth()
@Controller()
@Roles(Role.LANDLORD, Role.BOTH)
export class PaymentValidationController {
  constructor(
    private readonly validationService: PaymentValidationService,
  ) {}

  /**
   * Get all pending payment requests for the landlord's properties.
   * Returns requests with tenant and lease information.
   */
  @Get('landlords/me/pending-payments')
  @ApiOperation({
    summary: 'Get pending payment requests for validation',
    description:
      'Get all pending payment requests for properties where the current user is the landlord.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending payment requests',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a landlord' })
  async getPendingPayments(
    @CurrentUser() user: User,
  ): Promise<TenantPaymentRequest[]> {
    return this.validationService.getPendingForLandlord(user.id);
  }

  /**
   * Get a single payment request by ID.
   * Verifies landlord owns the associated lease.
   */
  @Get('payment-requests/:id')
  @ApiOperation({
    summary: 'Get payment request details',
    description:
      'Get a single payment request with tenant and lease information.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Payment request details',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the landlord of this lease' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async getPaymentRequest(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: User,
  ): Promise<TenantPaymentRequest> {
    return this.validationService.findByIdForLandlord(requestId, user.id);
  }

  /**
   * Approve a payment request.
   * Creates a Payment record via PaymentsService (Phase 9 compatible).
   */
  @Post('payment-requests/:id/approve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Approve payment request',
    description:
      'Approve a pending payment request. Creates a Payment record that integrates with payment history scoring.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Payment approved and recorded',
  })
  @ApiResponse({ status: 400, description: 'Request is not pending' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the landlord of this lease' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async approvePayment(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: User,
  ): Promise<{ message: string; payment: Payment }> {
    const payment = await this.validationService.approve(requestId, user.id);
    return {
      message: 'Payment approved successfully',
      payment,
    };
  }

  /**
   * Reject a payment request.
   * Requires a reason explaining why the payment was rejected.
   */
  @Post('payment-requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject payment request',
    description:
      'Reject a pending payment request with a reason. Tenant can view the rejection reason.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Payment rejected',
  })
  @ApiResponse({ status: 400, description: 'Request is not pending or invalid reason' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the landlord of this lease' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async rejectPayment(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() dto: RejectPaymentDto,
    @CurrentUser() user: User,
  ): Promise<{ message: string; request: TenantPaymentRequest }> {
    const request = await this.validationService.reject(
      requestId,
      user.id,
      dto.reason,
    );
    return {
      message: 'Payment rejected',
      request,
    };
  }

  /**
   * Get signed URL for receipt viewing.
   * Allows landlord to view the uploaded receipt for validation.
   */
  @Get('payment-requests/:id/receipt-url')
  @ApiOperation({
    summary: 'Get signed URL for receipt',
    description:
      'Get a time-limited signed URL to view the payment receipt. URL expires after 1 hour.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL for receipt',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the landlord of this lease' })
  @ApiResponse({ status: 404, description: 'Payment request or receipt not found' })
  async getReceiptUrl(
    @Param('id', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: User,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.validationService.getReceiptUrl(requestId, user.id);
  }
}
