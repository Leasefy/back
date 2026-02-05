import { Injectable, OnModuleInit } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SignatureAudit } from '../signature/signature-audit.interface.js';

export interface ContractTemplateData {
  // Parties
  landlordName: string;
  landlordId: string; // Cedula number
  landlordEmail: string;
  tenantName: string;
  tenantId: string; // Cedula number
  tenantEmail: string;

  // Property
  propertyAddress: string;
  propertyCity: string;
  propertyType: string;

  // Terms
  startDate: string; // Formatted: "1 de marzo de 2026"
  endDate: string;
  durationMonths: number;
  monthlyRent: string; // Formatted: "$2.500.000 COP"
  deposit: string;
  paymentDay: number; // 1-28

  // Optional
  customClauses: Array<{ title: string; content: string }>;

  // Insurance
  insuranceTier: string; // 'NONE', 'BASIC', 'PREMIUM'
  includesInsurance: boolean; // Computed: tier !== NONE, for template {{#if}}
  insuranceDetails?: string; // Auto-generated coverage text
  insurancePremium: number; // Monthly premium in COP
  insurancePremiumFormatted: string; // Formatted: "$25.000 COP"

  // Signatures (for signed version)
  signatures?: {
    landlord?: SignatureAudit;
    tenant?: SignatureAudit;
  };

  // Metadata
  contractNumber: string;
  generatedAt: string;
  documentHash?: string;
}

@Injectable()
export class ContractTemplateService implements OnModuleInit {
  private template!: Handlebars.TemplateDelegate<ContractTemplateData>;

  onModuleInit() {
    this.loadTemplate();
  }

  private loadTemplate() {
    const templatePath = join(__dirname, 'rental-contract.hbs');
    const templateSource = readFileSync(templatePath, 'utf-8');
    this.template = Handlebars.compile(templateSource);

    // Register helpers for Colombian formatting
    Handlebars.registerHelper('formatCurrency', (value: number) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
      }).format(value);
    });

    Handlebars.registerHelper('formatDate', (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    });
  }

  /**
   * Render contract HTML from template data.
   */
  render(data: ContractTemplateData): string {
    return this.template(data);
  }

  /**
   * Calculate duration in months between two dates.
   */
  calculateDurationMonths(startDate: Date, endDate: Date): number {
    const months =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());
    return months;
  }

  /**
   * Format a number as Colombian currency.
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  }

  /**
   * Format a date in Spanish locale for Colombian contracts.
   */
  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}
