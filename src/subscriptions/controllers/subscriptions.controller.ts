import { Controller, Get, Post, Body, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { User } from '@prisma/client';
import { SubscriptionsService } from '../services/subscriptions.service.js';
import { PlanEnforcementService } from '../services/plan-enforcement.service.js';
import {
  CreateSubscriptionDto,
  ChangePlanDto,
  MicropaymentDto,
} from '../dto/index.js';

@ApiTags('Suscripciones')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly planEnforcementService: PlanEnforcementService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener mi suscripcion actual' })
  @ApiResponse({
    status: 200,
    description: 'Estado de suscripcion, uso y plan',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getMySubscription(@Req() req: Request & { user: User }) {
    const userId = req.user.id;

    const [subscription, usage, planConfig] = await Promise.all([
      this.subscriptionsService.getActiveSubscription(userId),
      this.planEnforcementService.getUsageSummary(userId),
      this.subscriptionsService.getUserPlanConfig(userId),
    ]);

    return { subscription, usage, planConfig };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Obtener resumen de uso' })
  @ApiResponse({ status: 200, description: 'Resumen de uso del plan' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getUsage(@Req() req: Request & { user: User }) {
    return this.planEnforcementService.getUsageSummary(req.user.id);
  }

  @Post('trial')
  @ApiOperation({ summary: 'Iniciar periodo de prueba de 7 dias' })
  @ApiResponse({ status: 201, description: 'Trial iniciado' })
  @ApiResponse({ status: 400, description: 'Ya tienes una suscripcion activa' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async startTrial(
    @Req() req: Request & { user: User },
    @Body() body: { planId: string },
  ) {
    return this.subscriptionsService.startTrial(req.user.id, body.planId);
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Suscribirse a un plan' })
  @ApiResponse({ status: 201, description: 'Suscripcion creada' })
  @ApiResponse({
    status: 400,
    description: 'Error de validacion o pago rechazado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async subscribe(
    @Req() req: Request & { user: User },
    @Body() dto: CreateSubscriptionDto,
  ) {
    return this.subscriptionsService.subscribe(req.user.id, dto);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancelar suscripcion' })
  @ApiResponse({ status: 200, description: 'Suscripcion cancelada' })
  @ApiResponse({ status: 400, description: 'Suscripcion ya cancelada' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'No hay suscripcion activa' })
  async cancel(
    @Req() req: Request & { user: User },
    @Body() body: { reason?: string },
  ) {
    return this.subscriptionsService.cancel(req.user.id, body.reason);
  }

  @Post('change-plan')
  @ApiOperation({ summary: 'Cambiar de plan' })
  @ApiResponse({ status: 201, description: 'Plan cambiado exitosamente' })
  @ApiResponse({
    status: 400,
    description: 'Error de validacion o pago rechazado',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Plan no encontrado' })
  async changePlan(
    @Req() req: Request & { user: User },
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.changePlan(req.user.id, dto);
  }

  @Post('micropayment/scoring-view')
  @ApiOperation({ summary: 'Comprar vista adicional de scoring (micropago)' })
  @ApiResponse({ status: 201, description: 'Vista de scoring comprada' })
  @ApiResponse({
    status: 400,
    description: 'Pago rechazado o plan ya incluye vistas ilimitadas',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async purchaseScoringView(
    @Req() req: Request & { user: User },
    @Body() dto: MicropaymentDto,
  ) {
    const result = await this.subscriptionsService.purchaseScoringView(
      req.user.id,
      dto,
    );

    if (result.success) {
      await this.planEnforcementService.recordPaidScoringView(req.user.id);
    }

    return result;
  }
}
