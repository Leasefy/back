import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  HttpCode,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { EvaluationsService } from './evaluations.service.js';

/**
 * Extracts the Supabase JWT from the Authorization header.
 * The token is passed through to the agent microservice so the micro can
 * authenticate the same user against its own jwtMiddleware.
 */
function extractAccessToken(req: Request): string {
  const header = req.headers['authorization'] ?? '';
  if (typeof header !== 'string') return '';
  return header.replace(/^Bearer\s+/i, '');
}

@ApiTags('Evaluations')
@ApiBearerAuth()
@Roles(Role.LANDLORD)
@Controller('evaluations')
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  @Post(':applicationId')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicitar evaluacion unificada del aplicante' })
  @ApiResponse({ status: 202, description: 'Evaluacion iniciada' })
  @ApiResponse({ status: 400, description: 'Creditos insuficientes' })
  @ApiResponse({
    status: 403,
    description: 'Sin suscripcion activa o sin acceso',
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({ status: 429, description: 'Limite PRO de 30/mes alcanzado' })
  @ApiResponse({
    status: 503,
    description: 'Microservicio de agentes no disponible',
  })
  async requestEvaluation(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const accessToken = extractAccessToken(req);
    return this.evaluationsService.requestEvaluation(
      applicationId,
      userId,
      accessToken,
    );
  }

  @Get(':applicationId/result')
  @ApiOperation({ summary: 'Consultar resultado de evaluacion (polling)' })
  @ApiResponse({ status: 200, description: 'Estado actual de la evaluacion' })
  @ApiResponse({ status: 403, description: 'Sin acceso a la solicitud' })
  @ApiResponse({
    status: 404,
    description: 'No se encontro evaluacion para esta solicitud',
  })
  async getResult(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const accessToken = extractAccessToken(req);
    return this.evaluationsService.getResult(
      applicationId,
      userId,
      accessToken,
    );
  }
}
