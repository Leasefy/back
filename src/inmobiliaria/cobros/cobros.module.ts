import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { CobrosController } from './cobros.controller.js';
import { CobrosService } from './cobros.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [CobrosController],
  providers: [CobrosService],
  exports: [CobrosService],
})
export class CobrosModule {}
