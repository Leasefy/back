import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import type { User, LandlordPaymentMethod } from '@prisma/client';
import { CurrentUser, Roles } from '../../auth/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { LandlordPaymentMethodsService } from './landlord-payment-methods.service.js';
import {
  CreateLandlordPaymentMethodDto,
  UpdateLandlordPaymentMethodDto,
} from './dto/index.js';

/**
 * Controller for landlord payment method management.
 * Allows landlords to configure bank accounts for tenants to use when paying rent.
 *
 * All endpoints require LANDLORD or BOTH role.
 *
 * Requirements: TPAY-01, TPAY-02
 */
@ApiTags('Landlord Payment Methods')
@ApiBearerAuth()
@Controller('landlords/me/payment-methods')
@Roles(Role.LANDLORD, Role.BOTH)
export class LandlordPaymentMethodsController {
  constructor(
    private readonly paymentMethodsService: LandlordPaymentMethodsService,
  ) {}

  /**
   * Create a new payment method.
   * Landlord configures a bank account for tenants to transfer rent.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create payment method',
    description:
      'Create a new payment method (bank account) for tenants to use when paying rent.',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment method created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a landlord' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateLandlordPaymentMethodDto,
  ): Promise<LandlordPaymentMethod> {
    return this.paymentMethodsService.create(user.id, dto);
  }

  /**
   * Get all payment methods for the current landlord.
   * Includes both active and inactive methods.
   */
  @Get()
  @ApiOperation({
    summary: 'List my payment methods',
    description:
      'Get all payment methods configured by the current landlord.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of payment methods',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a landlord' })
  async findAll(@CurrentUser() user: User): Promise<LandlordPaymentMethod[]> {
    return this.paymentMethodsService.findAllForLandlord(user.id);
  }

  /**
   * Get a single payment method by ID.
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get payment method',
    description: 'Get a single payment method by ID.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Payment method details',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LandlordPaymentMethod> {
    return this.paymentMethodsService.findById(id, user.id);
  }

  /**
   * Update a payment method.
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update payment method',
    description: 'Update a payment method. All fields are optional.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Payment method updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLandlordPaymentMethodDto,
  ): Promise<LandlordPaymentMethod> {
    return this.paymentMethodsService.update(id, user.id, dto);
  }

  /**
   * Delete a payment method.
   * This is a hard delete. Use PATCH with isActive=false for soft delete.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete payment method',
    description:
      'Permanently delete a payment method. Use PATCH with isActive=false for soft delete.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 204,
    description: 'Payment method deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Payment method not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.paymentMethodsService.delete(id, user.id);
  }
}
