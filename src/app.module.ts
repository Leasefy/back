import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { PropertyAccessModule } from './property-access/property-access.module.js';
import { AgentsModule } from './agents/agents.module.js';
import { ApplicationsModule } from './applications/applications.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { ScoringModule } from './scoring/scoring.module.js';
import { LandlordModule } from './landlord/landlord.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { LeasesModule } from './leases/leases.module.js';
import { TenantPaymentsModule } from './tenant-payments/tenant-payments.module.js';
import { VisitsModule } from './visits/visits.module.js';
import { NotificationTemplatesModule } from './notification-templates/notification-templates.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { InsuranceModule } from './insurance/insurance.module.js';
import { ChatModule } from './chat/chat.module.js';
import { WishlistsModule } from './wishlists/wishlists.module.js';
import { CouponsModule } from './coupons/coupons.module.js';
import { ActivityLogModule } from './activity-log/activity-log.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { AgencyModule } from './inmobiliaria/agency/agency.module.js';
import { AgentesModule } from './inmobiliaria/agentes/agentes.module.js';
import { PipelineModule } from './inmobiliaria/pipeline/pipeline.module.js';
import { PropietariosModule } from './inmobiliaria/propietarios/propietarios.module.js';
import { ConsignacionesModule } from './inmobiliaria/consignaciones/consignaciones.module.js';
import { CobrosModule } from './inmobiliaria/cobros/cobros.module.js';
import { DispersionesModule } from './inmobiliaria/dispersiones/dispersiones.module.js';
import { MantenimientoModule } from './inmobiliaria/mantenimiento/mantenimiento.module.js';
import { RenovacionesModule } from './inmobiliaria/renovaciones/renovaciones.module.js';
import { DocumentosModule } from './inmobiliaria/documentos/documentos.module.js';
import { ActasModule } from './inmobiliaria/actas/actas.module.js';
import { ReportsModule } from './inmobiliaria/reports/reports.module.js';
import { AnalyticsModule } from './inmobiliaria/analytics/analytics.module.js';
import { InmobiliariaDashboardModule } from './inmobiliaria/dashboard/dashboard.module.js';
import { AiModule } from './ai/ai.module.js';
import { MlPersistenceModule } from './ml-persistence/ml-persistence.module.js';
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
    PropertyAccessModule,
    AgentsModule,
    ApplicationsModule,
    DocumentsModule,
    ScoringModule,
    LandlordModule,
    ContractsModule,
    InsuranceModule,
    LeasesModule,
    TenantPaymentsModule,
    VisitsModule,
    NotificationTemplatesModule,
    NotificationsModule,
    SubscriptionsModule,
    CouponsModule,
    ActivityLogModule,
    DashboardModule,
    ChatModule,
    WishlistsModule,
    RecommendationsModule,
    AgencyModule,
    AgentesModule,
    PipelineModule,
    PropietariosModule,
    ConsignacionesModule,
    CobrosModule,
    DispersionesModule,
    MantenimientoModule,
    RenovacionesModule,
    DocumentosModule,
    ActasModule,
    ReportsModule,
    AnalyticsModule,
    InmobiliariaDashboardModule,
    AiModule,
    MlPersistenceModule,
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
