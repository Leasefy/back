import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString =
  process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL or DIRECT_URL must be defined in .env');
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Default subscription plan configurations.
 *
 * Plans are different for Tenant and Landlord:
 * - Tenant: STARTER (1 scoring view/mo, micropay extra), PRO (unlimited, premium scoring)
 * - Landlord: STARTER (1 property), PRO (unlimited, premium), FLEX (credits-based, pay-per-use)
 *
 * Prices in COP. Annual prices ~80% of monthly*12 (2 months free).
 * Admin can modify prices via admin endpoints.
 */
const plans = [
  // ===== TENANT PLANS =====
  {
    planType: 'TENANT' as const,
    tier: 'STARTER' as const,
    name: 'Tenant Starter',
    description:
      'Plan gratuito para inquilinos. 1 vista de scoring basico por mes. Compra vistas adicionales por micropago.',
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: -1, // N/A for tenants
    maxScoringViews: 1, // 1 free view per month
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 9900, // COP per extra view
    evaluationCreditPrice: 0, // Tenants don't purchase evaluations
  },
  {
    planType: 'TENANT' as const,
    tier: 'PRO' as const,
    name: 'Tenant Pro',
    description:
      'Plan premium para inquilinos. Scoring premium ilimitado con analisis AI e historial de pagos.',
    monthlyPrice: 149000,
    annualPrice: 1430000, // ~80% of 149000*12 = 1788000
    maxProperties: -1, // N/A for tenants
    maxScoringViews: -1, // Unlimited
    hasPremiumScoring: true,
    hasApiAccess: false,
    scoringViewPrice: 0, // Not needed, unlimited views
    evaluationCreditPrice: 0, // Tenants don't purchase evaluations
  },

  // ===== LANDLORD PLANS =====
  {
    planType: 'LANDLORD' as const,
    tier: 'STARTER' as const,
    name: 'Landlord Starter',
    description:
      'Plan gratuito para propietarios. Publica 1 propiedad. Scoring basico de candidatos.',
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: 1,
    maxScoringViews: -1, // N/A for landlords (they see candidate scores)
    hasPremiumScoring: false,
    hasApiAccess: false,
    scoringViewPrice: 0,
    evaluationCreditPrice: 42_000, // $42,000 COP per evaluation
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'PRO' as const,
    name: 'Landlord Pro',
    description:
      'Plan profesional para propietarios. Propiedades ilimitadas. Scoring premium de candidatos con analisis AI completo.',
    monthlyPrice: 149000,
    annualPrice: 1430000, // ~80% of 149000*12 = 1788000
    maxProperties: -1, // Unlimited
    maxScoringViews: -1, // N/A for landlords
    hasPremiumScoring: true,
    hasApiAccess: false,
    scoringViewPrice: 0,
    evaluationCreditPrice: 21_000, // $21,000 COP per evaluation (50% discount)
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'FLEX' as const,
    name: 'Landlord Flex',
    description:
      'Plan de pago por uso para propietarios. Sin suscripcion mensual. Accede a evaluaciones premium usando creditos.',
    monthlyPrice: 0,
    annualPrice: 0,
    maxProperties: -1, // Unlimited
    maxScoringViews: -1, // N/A for landlords
    hasPremiumScoring: true,
    hasApiAccess: false,
    scoringViewPrice: 0,
    evaluationCreditPrice: 0, // Unlimited free evaluations (FLEX benefit)
  },
];

/**
 * Notification templates for subscription events.
 */
const subscriptionTemplates = [
  {
    code: 'TRIAL_EXPIRING',
    name: 'Trial expirando',
    emailSubject: 'Tu periodo de prueba termina manana',
    emailBody:
      'Hola {{userName}},\n\nTu periodo de prueba del plan **{{planName}}** termina el **{{date}}**.\n\nPara seguir disfrutando de todos los beneficios, suscribete antes de que termine.\n\nSi no te suscribes, tu cuenta sera cambiada al plan Starter automaticamente.',
    pushTitle: 'Trial expira manana',
    pushBody: 'Tu periodo de prueba del plan {{planName}} termina manana. Suscribete para no perder tus beneficios.',
  },
  {
    code: 'TRIAL_EXPIRED',
    name: 'Trial expirado',
    emailSubject: 'Tu periodo de prueba ha terminado',
    emailBody:
      'Hola {{userName}},\n\nTu periodo de prueba ha terminado y tu cuenta ha sido cambiada al plan Starter.\n\nPuedes suscribirte en cualquier momento para recuperar los beneficios premium.',
    pushTitle: 'Trial terminado',
    pushBody: 'Tu periodo de prueba ha terminado. Tu cuenta ahora tiene el plan Starter.',
  },
  {
    code: 'SUBSCRIPTION_EXPIRED',
    name: 'Suscripcion expirada',
    emailSubject: 'Tu suscripcion ha vencido',
    emailBody:
      'Hola {{userName}},\n\nTu suscripcion al plan **{{planName}}** ha vencido.\n\nTu cuenta ha sido cambiada al plan Starter. Puedes renovar tu suscripcion en cualquier momento.',
    pushTitle: 'Suscripcion vencida',
    pushBody: 'Tu suscripcion al plan {{planName}} ha vencido. Renueva para mantener tus beneficios.',
  },
  {
    code: 'SUBSCRIPTION_DOWNGRADED',
    name: 'Plan degradado a Starter',
    emailSubject: 'Tu plan ha sido cambiado a Starter',
    emailBody:
      'Hola {{userName}},\n\nTu plan ha sido cambiado a Starter. Si tenias propiedades adicionales publicadas, solo la mas antigua permanece visible.\n\nPuedes suscribirte nuevamente para publicar mas propiedades.',
    pushTitle: 'Plan cambiado a Starter',
    pushBody: 'Tu plan ha sido cambiado a Starter. Suscribete para recuperar tus beneficios.',
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
        evaluationCreditPrice: plan.evaluationCreditPrice,
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
        evaluationCreditPrice: plan.evaluationCreditPrice,
      },
    });

    console.log(`  Upserted: ${plan.name} (${plan.planType} ${plan.tier})`);
  }

  console.log(`\nSeeded ${plans.length} subscription plan configs.`);

  // Seed subscription notification templates
  console.log('\nSeeding subscription notification templates...');

  for (const template of subscriptionTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
        pushTitle: template.pushTitle,
        pushBody: template.pushBody,
      },
      create: {
        code: template.code,
        name: template.name,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
        pushTitle: template.pushTitle,
        pushBody: template.pushBody,
        isActive: true,
      },
    });

    console.log(`  Upserted template: ${template.code}`);
  }

  console.log(
    `Seeded ${subscriptionTemplates.length} subscription notification templates.`,
  );
}

main()
  .catch((e) => {
    console.error('Error seeding plans:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
