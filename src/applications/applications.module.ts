import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { ApplicationStateMachine } from './state-machine/application-state-machine.js';
import { ApplicationEventService } from './events/application-event.service.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [
    ConfigModule,
    // Import ScoringModule to access ScoringService for async scoring
    ScoringModule,
    // Import ChatModule for conversation creation on submit
    ChatModule,
  ],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationStateMachine,
    ApplicationEventService,
  ],
  exports: [
    ApplicationsService,
    ApplicationStateMachine,
    ApplicationEventService,
  ],
})
export class ApplicationsModule {}
