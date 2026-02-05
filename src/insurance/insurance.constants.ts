import { InsuranceTier } from '../common/enums/index.js';

export interface InsurancePlanDefinition {
  tier: InsuranceTier;
  name: string;                    // Display name in Spanish
  monthlyPremium: number;          // COP per month
  maxCoverage: number;             // Maximum coverage in COP
  coverageItems: string[];         // List of covered events (Spanish)
  description: string;             // Full description for contract (Spanish)
}

/**
 * Insurance plan definitions.
 * Constants-based (no database needed) since tiers are fixed business rules.
 * All text in Spanish for Colombian market.
 */
export const INSURANCE_PLANS: Record<InsuranceTier, InsurancePlanDefinition> = {
  [InsuranceTier.NONE]: {
    tier: InsuranceTier.NONE,
    name: 'Sin Seguro',
    monthlyPremium: 0,
    maxCoverage: 0,
    coverageItems: [],
    description: '',
  },
  [InsuranceTier.BASIC]: {
    tier: InsuranceTier.BASIC,
    name: 'Seguro Basico',
    monthlyPremium: 25000,       // $25,000 COP/month
    maxCoverage: 5000000,        // $5,000,000 COP
    coverageItems: [
      'Danos accidentales al inmueble',
      'Danos a instalaciones electricas e hidraulicas',
      'Danos por uso normal que excedan el desgaste esperado',
    ],
    description:
      'SEGURO BASICO DE ARRENDAMIENTO: El presente contrato incluye un seguro basico ' +
      'de arrendamiento con cobertura de hasta $5.000.000 COP para danos accidentales ' +
      'al inmueble, incluyendo danos a instalaciones electricas e hidraulicas y danos ' +
      'por uso que excedan el desgaste normal. Prima mensual: $25.000 COP. ' +
      'La cobertura aplica durante la vigencia del contrato.',
  },
  [InsuranceTier.PREMIUM]: {
    tier: InsuranceTier.PREMIUM,
    name: 'Seguro Premium',
    monthlyPremium: 75000,       // $75,000 COP/month
    maxCoverage: 20000000,       // $20,000,000 COP
    coverageItems: [
      'Danos accidentales al inmueble',
      'Danos a instalaciones electricas e hidraulicas',
      'Danos por uso normal que excedan el desgaste esperado',
      'Desastres naturales (inundaciones, terremotos, incendios)',
      'Robo o hurto de elementos fijos del inmueble',
      'Responsabilidad civil frente a terceros',
    ],
    description:
      'SEGURO PREMIUM DE ARRENDAMIENTO: El presente contrato incluye un seguro premium ' +
      'de arrendamiento con cobertura de hasta $20.000.000 COP. Incluye proteccion ' +
      'contra danos accidentales, desastres naturales (inundaciones, terremotos, incendios), ' +
      'robo o hurto de elementos fijos del inmueble y responsabilidad civil frente a ' +
      'terceros. Prima mensual: $75.000 COP. La cobertura aplica durante la vigencia del contrato.',
  },
};
