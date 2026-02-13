import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { PropietariosController } from './propietarios.controller.js';
import { PropietariosService } from './propietarios.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [PropietariosController],
  providers: [PropietariosService],
  exports: [PropietariosService],
})
export class PropietariosModule {}
