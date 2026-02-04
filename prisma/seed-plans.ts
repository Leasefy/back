import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default subscription plan configurations.
 *
 * Plans are different for Tenant and Landlord:
 * - Tenant: FREE (1 scoring view/mo, micropay extra), PRO (unlimited, premium scoring)
 * - Landlord: FREE (1 property), PRO (10 properties, premium), BUSINESS (unlimited, API)
 *
 * Prices in COP. Annual prices ~80% of monthly*12 (2 months free).
 * Admin can modify prices via admin endpoints.
 */
const plans = [
  // ===== TENANT PLANS =====
  {
    planType: 'TENANT' as const,
    tier: 'FREE' as const,
    name: 'Tenant Gratis',
    description:
      'Plan gratuito para inquilinos. 1 vista de scoring basico por mes. Compra vistas adicionales por micropago.',
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: -1, // N/A for tenants
    maxScoringViews: 1, // 1 free view per month
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 9900, // COP per extra view
  },
  {
    planType: 'TENANT' as const,
    tier: 'PRO' as const,
    name: 'Tenant Pro',
    description:
      'Plan premium para inquilinos. Scoring premium ilimitado con analisis AI e historial de pagos.',
    monthlyPrice: 49900,
    annualPrice: 479000, // ~80% of 49900*12 = 598800
    maxProperties: -1, // N/A for tenants
    maxScoringViews: -1, // Unlimited
    hasPremiumScoring: true,
    hasApiAccess: false,
    scoringViewPrice: 0, // Not needed, unlimited views
  },

  // ===== LANDLORD PLANS =====
  {
    planType: 'LANDLORD' as const,
    tier: 'FREE' as const,
    name: 'Landlord Gratis',
    description:
      'Plan gratuito para propietarios. Publica 1 propiedad. Scoring basico de candidatos.',
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: 1,
    maxScoringViews: -1, // N/A for landlords (they see candidate scores)
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 0,
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'PRO' as const,
    name: 'Landlord Pro',
    description:
      'Plan profesional para propietarios. Hasta 10 propiedades. Scoring premium de candidatos con analisis AI.',
    monthlyPrice: 149900,
    annualPrice: 1439000, // ~80% of 149900*12 = 1798800
    maxProperties: 10,
    maxScoringViews: -1, // N/A for landlords
    hasPremiumScoring: true,
    hasApiAccess: false,
    scoringViewPrice: 0,
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'BUSINESS' as const,
    name: 'Landlord Business',
    description:
      'Plan empresarial para propietarios. Propiedades ilimitadas. Scoring premium completo. Acceso API.',
    monthlyPrice: 499900,
    annualPrice: 4799000, // ~80% of 499900*12 = 5998800
    maxProperties: -1, // Unlimited
    maxScoringViews: -1, // N/A for landlords
    hasPremiumScoring: true,
    hasApiAccess: true,
    scoringViewPrice: 0,
  },
];

async function main() {
  console.log('Seeding subscription plan configs...');

  for (const plan of plans) {
    await prisma.subscriptionPlanConfig.upsert({
      where: {
        planType_tier: {
          planType: plan.planType,
          tier: plan.tier,
        },
      },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxProperties: plan.maxProperties,
        maxScoringViews: plan.maxScoringViews,
        hasPremiumScoring: plan.hasPremiumScoring,
        hasApiAccess: plan.hasApiAccess,
        scoringViewPrice: plan.scoringViewPrice,
      },
      create: {
        planType: plan.planType,
        tier: plan.tier,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        maxProperties: plan.maxProperties,
        maxScoringViews: plan.maxScoringViews,
        hasPremiumScoring: plan.hasPremiumScoring,
        hasApiAccess: plan.hasApiAccess,
        scoringViewPrice: plan.scoringViewPrice,
      },
    });

    console.log(`  Upserted: ${plan.name} (${plan.planType} ${plan.tier})`);
  }

  console.log(`\nSeeded ${plans.length} subscription plan configs.`);
}

main()
  .catch((e) => {
    console.error('Error seeding plans:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
