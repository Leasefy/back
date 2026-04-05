import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { AgentCreditsService } from './agent-credits.service.js';
import { BuyCreditsDto } from './dto/buy-credits.dto.js';

@ApiTags('Agent Credits')
@ApiBearerAuth()
@Roles(Role.LANDLORD, Role.AGENT)
@Controller('agent-credits')
export class AgentCreditsController {
  constructor(private readonly agentCreditsService: AgentCreditsService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Consultar saldo de creditos' })
  @ApiOkResponse({ description: 'Saldo actual de creditos' })
  async getBalance(@CurrentUser('id') userId: string) {
    return this.agentCreditsService.getBalance(userId);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Comprar pack de creditos via PSE' })
  @ApiCreatedResponse({ description: 'Creditos comprados exitosamente' })
  async purchase(
    @CurrentUser('id') userId: string,
    @Body() dto: BuyCreditsDto,
  ) {
    return this.agentCreditsService.purchaseCredits(userId, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historial de transacciones de creditos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Pagina (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Resultados por pagina (default 20, max 100)' })
  @ApiOkResponse({ description: 'Historial paginado de transacciones' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
    return this.agentCreditsService.getTransactionHistory(userId, parsedPage, parsedLimit);
  }
}
