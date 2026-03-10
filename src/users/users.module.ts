import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AgencyModule } from '../inmobiliaria/agency/agency.module.js';

/**
 * User profile management module.
 * Exports UsersService for use by other modules (e.g., AuthModule).
 * Imports AgencyModule to support INMOBILIARIA onboarding flow.
 */
@Module({
  imports: [AgencyModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
