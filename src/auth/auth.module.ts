import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../database/prisma.module.js';
import { SupabaseStrategy } from './strategies/supabase.strategy.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { TeamAccessGuard } from './guards/team-access.guard.js';

/**
 * Authentication module providing Supabase JWT validation and role-based access control.
 *
 * Exports:
 * - SupabaseAuthGuard: Validates JWT tokens, respects @Public() decorator
 * - RolesGuard: Enforces @Roles() restrictions, allows AGENT role access to LANDLORD routes
 * - TeamAccessGuard: Enforces @RequireTeamPermission() for landlord team member roles
 *
 * Usage:
 * 1. Import AuthModule in AppModule
 * 2. Register guards globally via APP_GUARD providers
 * 3. Use decorators: @Public(), @Roles(), @CurrentUser(), @RequireTeamPermission()
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase' }),
    PrismaModule,
  ],
  providers: [SupabaseStrategy, SupabaseAuthGuard, RolesGuard, TeamAccessGuard],
  exports: [SupabaseAuthGuard, RolesGuard, TeamAccessGuard],
})
export class AuthModule {}
