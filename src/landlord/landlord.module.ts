import { Module } from '@nestjs/common';
import { LandlordController } from './landlord.controller.js';
import { LandlordService } from './landlord.service.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';
import { PropertyAccessModule } from '../property-access/property-access.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { PropertiesModule } from '../properties/properties.module.js';
import { TeamAccessGuard } from '../auth/guards/team-access.guard.js';

@Module({
  imports: [
    ApplicationsModule,
    DocumentsModule,
    ScoringModule,
    PropertyAccessModule,
    ChatModule,
    PropertiesModule,
  ],
  controllers: [LandlordController],
  providers: [LandlordService, TeamAccessGuard],
  exports: [LandlordService],
})
export class LandlordModule {}
