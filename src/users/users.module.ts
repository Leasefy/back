import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AgencyModule } from '../inmobiliaria/agency/agency.module.js';
import { TeamAccessGuard } from '../auth/guards/team-access.guard.js';
import { InvitationExpirationScheduler } from './scheduled/invitation-expiration.scheduler.js';

/**
 * User profile management module.
 * Exports UsersService for use by other modules (e.g., AuthModule).
 * Imports AgencyModule to support INMOBILIARIA onboarding flow.
 * Registers InvitationExpirationScheduler for automatic invitation cleanup.
 */
@Module({
  imports: [AgencyModule, ScheduleModule.forRoot()],
  controllers: [UsersController],
  providers: [UsersService, TeamAccessGuard, InvitationExpirationScheduler],
  exports: [UsersService],
})
export class UsersModule {}
