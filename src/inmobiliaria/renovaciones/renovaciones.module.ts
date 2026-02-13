import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { RenovacionesController } from './renovaciones.controller.js';
import { RenovacionesService } from './renovaciones.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [RenovacionesController],
  providers: [RenovacionesService],
  exports: [RenovacionesService],
})
export class RenovacionesModule {}
