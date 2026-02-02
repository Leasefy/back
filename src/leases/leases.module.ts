import { Module } from '@nestjs/common';
import { ContractActivatedListener } from './events/contract-activated.listener.js';

/**
 * LeasesModule
 *
 * Provides lease management functionality.
 * Listener creates leases automatically when contracts are activated.
 *
 * Note: PrismaModule is global, no need to import.
 * Note: Services and controller will be added in 08-03.
 */
@Module({
  providers: [ContractActivatedListener],
  exports: [],
})
export class LeasesModule {}
