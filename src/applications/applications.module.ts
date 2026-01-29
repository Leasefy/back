import { Module } from '@nestjs/common';
import { ApplicationStateMachine } from './state-machine/application-state-machine.js';
import { ApplicationEventService } from './events/application-event.service.js';

@Module({
  providers: [ApplicationStateMachine, ApplicationEventService],
  exports: [ApplicationStateMachine, ApplicationEventService],
})
export class ApplicationsModule {}
