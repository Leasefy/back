import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../database/prisma.module.js';
import { SupabaseStrategy } from './strategies/supabase.strategy.js';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';

/**
 * Authentication module providing Supabase JWT validation and role-based access control.
 *
 * Exports:
 * - SupabaseAuthGuard: Validates JWT tokens, respects @Public() decorator
 * - RolesGuard: Enforces @Roles() restrictions, allows AGENT role access to LANDLORD routes
 *
 * Usage:
 * 1. Import AuthModule in AppModule
 * 2. Register guards globally via APP_GUARD providers
 * 3. Use decorators: @Public(), @Roles(), @CurrentUser()
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase' }),
    PrismaModule,
  ],
  providers: [SupabaseStrategy, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
