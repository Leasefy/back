import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { ConsignacionesController } from './consignaciones.controller.js';
import { ConsignacionesService } from './consignaciones.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [ConsignacionesController],
  providers: [ConsignacionesService],
  exports: [ConsignacionesService],
})
export class ConsignacionesModule {}
