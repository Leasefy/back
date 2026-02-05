import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { TenantPaymentsService } from './tenant-payments.service.js';
import { CreatePaymentRequestDto, PaymentInfoResponseDto } from './dto/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role, PaymentMethod } from '../common/enums/index.js';
import type { User, TenantPaymentRequest, LandlordPaymentMethod } from '@prisma/client';

/**
 * TenantPaymentsController
 *
 * REST API endpoints for tenant payment operations.
 * All endpoints under /leases/:leaseId scope for tenant users.
 *
 * Requirements: TPAY-03, TPAY-05, TPAY-06, TPAY-09
 */
@ApiTags('Tenant Payments')
@ApiBearerAuth()
@Controller('leases/:leaseId')
export class TenantPaymentsController {
  constructor(private readonly service: TenantPaymentsService) {}

  /**
   * GET /leases/:leaseId/payment-methods
   * Get landlord's configured payment methods for this lease.
   *
   * Requirements: TPAY-03
   */
  @Get('payment-methods')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get landlord payment methods for lease' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'List of landlord payment methods' })
  @ApiResponse({ status: 403, description: 'Not tenant of this lease' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getPaymentMethods(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ): Promise<LandlordPaymentMethod[]> {
    return this.service.getPaymentMethodsForLease(leaseId, user.id);
  }

  /**
   * GET /leases/:leaseId/payment-info
   * Get payment info with auto-filled amount and current period.
   *
   * Requirements: TPAY-05
   */
  @Get('payment-info')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get payment info with auto-filled amount' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Payment info with amount and methods', type: PaymentInfoResponseDto })
  @ApiResponse({ status: 403, description: 'Not tenant of this lease' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getPaymentInfo(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ): Promise<PaymentInfoResponseDto> {
    return this.service.getPaymentInfo(leaseId, user.id);
  }

  /**
   * POST /leases/:leaseId/payment-requests
   * Create a payment request with receipt upload.
   *
   * Requirements: TPAY-06, TPAY-09
   */
  @Post('payment-requests')
  @Roles(Role.TENANT)
  @UseInterceptors(FileInterceptor('receipt'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create payment request with receipt upload' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['receipt', 'paymentMethod', 'periodMonth', 'periodYear', 'paymentDate'],
      properties: {
        receipt: {
          type: 'string',
          format: 'binary',
          description: 'Receipt file (PDF, JPEG, PNG, WebP, max 5MB)',
        },
        amount: {
          type: 'integer',
          description: 'Amount in COP (defaults to lease rent)',
          example: 1500000,
        },
        paymentMethod: {
          type: 'string',
          enum: Object.values(PaymentMethod),
          description: 'Payment method used',
        },
        periodMonth: {
          type: 'integer',
          minimum: 1,
          maximum: 12,
          description: 'Month of rental period (1-12)',
        },
        periodYear: {
          type: 'integer',
          minimum: 2020,
          maximum: 2100,
          description: 'Year of rental period',
        },
        paymentDate: {
          type: 'string',
          format: 'date',
          description: 'Date payment was made (YYYY-MM-DD)',
        },
        referenceNumber: {
          type: 'string',
          maxLength: 100,
          description: 'Reference number from receipt',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Payment request created' })
  @ApiResponse({ status: 400, description: 'Invalid data or lease not active' })
  @ApiResponse({ status: 403, description: 'Not tenant of this lease' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  @ApiResponse({ status: 409, description: 'Duplicate request or payment exists' })
  async createPaymentRequest(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Body() dto: CreatePaymentRequestDto,
    @UploadedFile() receipt: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<TenantPaymentRequest> {
    if (!receipt) {
      throw new BadRequestException('Receipt file is required');
    }
    return this.service.createWithReceipt(user.id, leaseId, dto, receipt);
  }

  /**
   * GET /leases/:leaseId/payment-requests
   * List my payment requests for this lease.
   */
  @Get('payment-requests')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'List my payment requests for this lease' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'List of payment requests' })
  @ApiResponse({ status: 403, description: 'Not tenant of this lease' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async listPaymentRequests(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ): Promise<TenantPaymentRequest[]> {
    return this.service.findByLease(leaseId, user.id);
  }

  /**
   * GET /leases/:leaseId/payment-requests/:requestId
   * Get payment request details.
   */
  @Get('payment-requests/:requestId')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get payment request details' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiParam({ name: 'requestId', type: String, description: 'Payment request ID' })
  @ApiResponse({ status: 200, description: 'Payment request details with receipt URL' })
  @ApiResponse({ status: 403, description: 'Not owner of this request' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async getPaymentRequest(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: User,
  ) {
    return this.service.findById(requestId, user.id);
  }

  /**
   * DELETE /leases/:leaseId/payment-requests/:requestId
   * Cancel a pending payment request.
   */
  @Delete('payment-requests/:requestId')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Cancel pending payment request' })
  @ApiParam({ name: 'leaseId', type: String, description: 'Lease ID' })
  @ApiParam({ name: 'requestId', type: String, description: 'Payment request ID' })
  @ApiResponse({ status: 200, description: 'Payment request cancelled' })
  @ApiResponse({ status: 400, description: 'Only pending requests can be cancelled' })
  @ApiResponse({ status: 403, description: 'Not owner of this request' })
  @ApiResponse({ status: 404, description: 'Payment request not found' })
  async cancelPaymentRequest(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Param('requestId', ParseUUIDPipe) requestId: string,
    @CurrentUser() user: User,
  ): Promise<TenantPaymentRequest> {
    return this.service.cancel(requestId, user.id);
  }
}
