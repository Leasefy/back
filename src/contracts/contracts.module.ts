import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';
import { ContractStateMachine } from './state-machine/contract-state-machine.js';
import { ContractTemplateService } from './templates/contract-template.service.js';
import { SignatureService } from './signature/signature.service.js';

/**
 * ContractsModule
 *
 * Provides contract management functionality.
 * Integrates services from 07-02:
 * - ContractStateMachine for lifecycle transitions
 * - ContractTemplateService for HTML rendering
 * - SignatureService for Ley 527 compliant signatures
 *
 * Note: PrismaModule is global, no need to import
 */
@Module({
  imports: [],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractStateMachine,
    ContractTemplateService,
    SignatureService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
