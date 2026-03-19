import { Module } from '@nestjs/common';
import { AgentesController } from './agentes.controller.js';
import { AgentesService } from './agentes.service.js';
import { AgencyModule } from '../agency/agency.module.js';

@Module({
  imports: [AgencyModule],
  controllers: [AgentesController],
  providers: [AgentesService],
})
export class AgentesModule {}
