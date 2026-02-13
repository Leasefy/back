import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller.js';
import { AgencyService } from './agency.service.js';
import { AgencyMemberGuard } from './guards/agency-member.guard.js';

@Module({
  controllers: [AgencyController],
  providers: [AgencyService, AgencyMemberGuard],
  exports: [AgencyService, AgencyMemberGuard],
})
export class AgencyModule {}
