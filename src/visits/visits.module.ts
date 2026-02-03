import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { VisitStateMachine } from './state-machine/visit-state-machine.js';
import { AvailabilityService } from './availability/availability.service.js';
import { SlotsService } from './availability/slots.service.js';
import { VisitsService } from './visits.service.js';
import { VisitsController } from './visits.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [VisitsController],
  providers: [VisitStateMachine, AvailabilityService, SlotsService, VisitsService],
  exports: [VisitStateMachine, AvailabilityService, SlotsService, VisitsService],
})
export class VisitsModule {}
