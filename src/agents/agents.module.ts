import { Module } from '@nestjs/common';
import { PropertyAccessModule } from '../property-access/property-access.module.js';
import { AgentsController } from './agents.controller.js';

@Module({
  imports: [PropertyAccessModule],
  controllers: [AgentsController],
})
export class AgentsModule {}
