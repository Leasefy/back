import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { ActasController } from './actas.controller.js';
import { ActasService } from './actas.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [ActasController],
  providers: [ActasService],
  exports: [ActasService],
})
export class ActasModule {}
