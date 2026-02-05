import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DisputesService } from './disputes.service.js';
import { CreateDisputeDto } from './dto/index.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import type { User } from '@prisma/client';

/**
 * DisputesController
 *
 * REST endpoints for payment dispute management.
 * Allows tenants to dispute rejected payment requests
 * and view their disputes.
 *
 * Endpoints:
 * - POST /payment-requests/:id/dispute - Open dispute for rejected payment
 * - GET /disputes - List tenant's disputes
 * - GET /disputes/:id - Get dispute details
 * - GET /disputes/:id/evidence-url - Get signed URL for additional evidence
 *
 * Requirements: TPAY-11, TPAY-12
 */
@ApiTags('Payment Disputes')
@ApiBearerAuth()
@Controller()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  /**
   * POST /payment-requests/:id/dispute
   * Open a dispute for a rejected payment request.
   *
   * Tenant can provide a reason and optionally upload additional evidence.
   * Creates a support ticket (OPEN status) for admin review.
   *
   * Requirements: TPAY-11, TPAY-12
   */
  @Post('payment-requests/:id/dispute')
  @Roles(Role.TENANT)
  @UseInterceptors(FileInterceptor('evidence'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Open dispute for rejected payment' })
  @ApiParam({ name: 'id', type: String, description: 'Payment request ID' })
  @ApiResponse({
    status: 201,
    description: 'Dispute created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Dispute already exists or request not rejected',
  })
  @ApiResponse({
    status: 404,
    description: 'Payment request not found or not rejected',
  })
  async createDispute(
    @Param('id', ParseUUIDPipe) paymentRequestId: string,
    @Body() dto: CreateDisputeDto,
    @UploadedFile() evidenceFile: Express.Multer.File | undefined,
    @CurrentUser() user: User,
  ) {
    const dispute = await this.disputesService.create(
      paymentRequestId,
      user.id,
      dto.reason,
      evidenceFile,
    );
    return {
      message:
        'Dispute opened successfully. Our support team will review your case.',
      dispute,
    };
  }

  /**
   * GET /disputes
   * List all disputes for the current tenant.
   *
   * Returns disputes with payment request details (amount, period, rejection reason).
   */
  @Get('disputes')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'List my disputes' })
  @ApiResponse({
    status: 200,
    description: 'List of disputes with payment request details',
  })
  async listDisputes(@CurrentUser() user: User) {
    return this.disputesService.findByTenant(user.id);
  }

  /**
   * GET /disputes/:id
   * Get details of a specific dispute.
   *
   * Includes full payment request information.
   */
  @Get('disputes/:id')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get dispute details' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute ID' })
  @ApiResponse({
    status: 200,
    description: 'Dispute details with payment request',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - not your dispute',
  })
  @ApiResponse({
    status: 404,
    description: 'Dispute not found',
  })
  async getDispute(
    @Param('id', ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: User,
  ) {
    return this.disputesService.findById(disputeId, user.id);
  }

  /**
   * GET /disputes/:id/evidence-url
   * Get signed URL for viewing additional evidence.
   *
   * Returns 404 if no additional evidence was attached.
   */
  @Get('disputes/:id/evidence-url')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get signed URL for additional evidence' })
  @ApiParam({ name: 'id', type: String, description: 'Dispute ID' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL with expiration',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - not your dispute',
  })
  @ApiResponse({
    status: 404,
    description: 'Dispute or evidence not found',
  })
  async getEvidenceUrl(
    @Param('id', ParseUUIDPipe) disputeId: string,
    @CurrentUser() user: User,
  ) {
    return this.disputesService.getEvidenceUrl(disputeId, user.id);
  }
}
