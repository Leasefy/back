import { Module } from '@nestjs/common';
import { LeasesController } from './leases.controller.js';
import { LeaseDocumentsController } from './lease-documents.controller.js';
import { LeasesService } from './leases.service.js';
import { PaymentsService } from './payments.service.js';
import { LeaseDocumentsService } from './lease-documents.service.js';
import { ContractActivatedListener } from './events/contract-activated.listener.js';

/**
 * LeasesModule
 *
 * Provides lease and payment management functionality.
 * - ContractActivatedListener creates leases when contracts are activated
 * - LeasesService handles lease retrieval and status
 * - PaymentsService handles payment recording and history
 * - LeaseDocumentsService handles lease document storage and access
 *
 * Note: PrismaModule is global, no need to import.
 *
 * Requirements: LEAS-01 through LEAS-08
 */
@Module({
  controllers: [LeasesController, LeaseDocumentsController],
  providers: [
    LeasesService,
    PaymentsService,
    LeaseDocumentsService,
    ContractActivatedListener,
  ],
  exports: [LeasesService, PaymentsService, LeaseDocumentsService],
})
export class LeasesModule {}
