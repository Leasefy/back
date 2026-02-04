import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator.js';
import { Roles } from '../../auth/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { SubscriptionPlansService } from '../services/subscription-plans.service.js';
import { UpdatePlanPricingDto } from '../dto/index.js';
import type { PlanType } from '../../common/enums/index.js';

@ApiTags('Planes de Suscripcion')
@Controller('subscription-plans')
export class SubscriptionPlansController {
  constructor(
    private readonly subscriptionPlansService: SubscriptionPlansService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Listar planes disponibles' })
  @ApiQuery({
    name: 'planType',
    required: false,
    enum: ['TENANT', 'LANDLORD'],
    description: 'Filtrar por tipo de plan',
  })
  @ApiResponse({ status: 200, description: 'Lista de planes disponibles' })
  async findAll(@Query('planType') planType?: PlanType) {
    return this.subscriptionPlansService.findAll(planType);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtener detalle de un plan' })
  @ApiResponse({ status: 200, description: 'Detalle del plan' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionPlansService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar precios del plan (Admin)' })
  @ApiResponse({ status: 200, description: 'Plan actualizado' })
  @ApiResponse({ status: 400, description: 'Error de validacion' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Requiere rol ADMIN' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async updatePricing(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanPricingDto,
  ) {
    return this.subscriptionPlansService.updatePricing(id, dto);
  }
}
