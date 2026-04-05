import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AgencyMemberGuard } from '../inmobiliaria/agency/guards/agency-member.guard.js';
import { AgencyPermissionGuard } from '../inmobiliaria/agency/guards/agency-permission.guard.js';
import { RequirePermission } from '../inmobiliaria/agency/decorators/require-permission.decorator.js';
import { CurrentAgency } from '../inmobiliaria/agency/decorators/current-agency.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { FlexBillingService } from './flex-billing.service.js';
import { ReportCanonDto } from './dto/report-canon.dto.js';
import { FlexBillingDashboardDto } from './dto/flex-billing-dashboard.dto.js';

@ApiTags('inmobiliaria/flex-billing')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/flex-billing')
export class FlexBillingController {
  constructor(private readonly flexBillingService: FlexBillingService) {}

  @Post('canon')
  @RequirePermission('cobros', 'edit')
  @ApiOperation({ summary: 'Reportar canon manualmente (pagos no-PSE)' })
  @ApiCreatedResponse({ description: 'Canon registrado exitosamente' })
  async reportCanon(
    @CurrentAgency('agencyId') agencyId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportCanonDto,
  ) {
    return this.flexBillingService.reportManualCanon(agencyId, userId, dto);
  }

  @Get('dashboard')
  @RequirePermission('dashboard', 'view')
  @ApiOperation({ summary: 'Dashboard FLEX billing (canon total + 1% fee)' })
  @ApiOkResponse({ type: FlexBillingDashboardDto, description: 'Resumen de canon y fee' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Filtrar por ano' })
  async getDashboard(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('year') year?: string,
  ) {
    return this.flexBillingService.getDashboard(
      agencyId,
      year ? parseInt(year, 10) : undefined,
    );
  }
}
