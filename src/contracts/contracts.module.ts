import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InsuranceModule } from '../insurance/insurance.module.js';
import { PropertyAccessModule } from '../property-access/property-access.module.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsService } from './contracts.service.js';
import { ContractStateMachine } from './state-machine/contract-state-machine.js';
import { ContractTemplateService } from './templates/contract-template.service.js';
import { SignatureService } from './signature/signature.service.js';
import { PdfGeneratorService } from './pdf/pdf-generator.service.js';

/**
 * ContractsModule
 *
 * Provides contract management functionality.
 * Integrates services from 07-02 and 07-04:
 * - ContractStateMachine for lifecycle transitions
 * - ContractTemplateService for HTML rendering
 * - SignatureService for Ley 527 compliant signatures
 * - PdfGeneratorService for PDF generation and Storage upload
 *
 * Note: PrismaModule is global, no need to import
 */
@Module({
  imports: [ConfigModule, InsuranceModule, PropertyAccessModule],
  controllers: [ContractsController],
  providers: [
    ContractsService,
    ContractStateMachine,
    ContractTemplateService,
    SignatureService,
    PdfGeneratorService,
  ],
  exports: [ContractsService],
})
export class ContractsModule {}
