import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { DispersionesController } from './dispersiones.controller.js';
import { DispersionesService } from './dispersiones.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [DispersionesController],
  providers: [DispersionesService],
  exports: [DispersionesService],
})
export class DispersionesModule {}
