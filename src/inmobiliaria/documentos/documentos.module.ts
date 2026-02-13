import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { DocumentosController } from './documentos.controller.js';
import { DocumentosService } from './documentos.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [DocumentosController],
  providers: [DocumentosService],
  exports: [DocumentosService],
})
export class DocumentosModule {}
