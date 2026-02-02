import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { LandlordModule } from './landlord/landlord.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { LeasesModule } from './leases/leases.module.js';
import { TenantPaymentsModule } from './tenant-payments/tenant-payments.module.js';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot({
      // No wildcards needed, using explicit event names
      wildcard: false,
      // Throw errors from listeners (for debugging)
      ignoreErrors: false,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    ApplicationsModule,
    DocumentsModule,
    ScoringModule,
    LandlordModule,
    ContractsModule,
    LeasesModule,
    TenantPaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guards - ORDER MATTERS: Auth first, then Roles
    // Auth guard must run before roles guard to ensure user is populated
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
