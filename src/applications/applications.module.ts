import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationStateMachine } from './state-machine/application-state-machine.js';
import { ApplicationEventService } from './events/application-event.service.js';
import { ScoringModule } from '../scoring/scoring.module.js';

@Module({
  imports: [
    // Import ScoringModule to access ScoringService for async scoring
    ScoringModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationStateMachine,
    ApplicationEventService,
  ],
  exports: [ApplicationsService, ApplicationStateMachine, ApplicationEventService],
})
export class ApplicationsModule {}
