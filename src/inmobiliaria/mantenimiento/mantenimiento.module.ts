import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { MantenimientoController } from './mantenimiento.controller.js';
import { MantenimientoService } from './mantenimiento.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [MantenimientoController],
  providers: [MantenimientoService],
  exports: [MantenimientoService],
})
export class MantenimientoModule {}
