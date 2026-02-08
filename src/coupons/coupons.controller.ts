import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { CouponsService } from './coupons.service.js';
import { CouponValidationService } from './coupon-validation.service.js';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
} from './dto/index.js';

/**
 * CouponsAdminController
 *
 * Admin-only CRUD endpoints for coupon management.
 * POST   /admin/coupons       - Create coupon
 * GET    /admin/coupons       - List all coupons
 * PATCH  /admin/coupons/:id   - Update coupon
 * DELETE /admin/coupons/:id   - Deactivate coupon
 */
@ApiTags('Admin - Cupones')
@Controller('admin/coupons')
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class CouponsAdminController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nuevo cupon (Admin)' })
  @ApiResponse({ status: 201, description: 'Cupon creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error de validacion' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los cupones con estadisticas (Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de cupones' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cupon (Admin)' })
  @ApiResponse({ status: 200, description: 'Cupon actualizado' })
  @ApiResponse({ status: 400, description: 'Error de validacion' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  @ApiResponse({ status: 404, description: 'Cupon no encontrado' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar cupon (Admin)' })
  @ApiResponse({ status: 200, description: 'Cupon desactivado' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  @ApiResponse({ status: 404, description: 'Cupon no encontrado' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.deactivate(id);
  }
}

/**
 * CouponsPublicController
 *
 * Public endpoint for coupon validation.
 * POST /coupons/validate - Validate coupon code for user
 */
@ApiTags('Cupones')
@Controller('coupons')
@ApiBearerAuth()
export class CouponsPublicController {
  constructor(
    private readonly couponValidationService: CouponValidationService,
  ) {}

  @Post('validate')
  @ApiOperation({ summary: 'Validar codigo de cupon' })
  @ApiResponse({
    status: 200,
    description: 'Resultado de validacion con mensaje',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async validate(
    @Req() req: Request & { user: User },
    @Body() dto: ValidateCouponDto,
  ) {
    return this.couponValidationService.validateCoupon(
      dto.code,
      req.user.id,
      dto.planId,
    );
  }
}
