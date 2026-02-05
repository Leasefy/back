import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionPlansService } from './subscription-plans.service.js';
import { PseMockService } from '../../tenant-payments/pse-mock/pse-mock.service.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';
import type { Subscription, SubscriptionPlanConfig } from '@prisma/client';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  PlanType,
} from '../../common/enums/index.js';
import type { CreateSubscriptionDto } from '../dto/create-subscription.dto.js';
import type { ChangePlanDto } from '../dto/change-plan.dto.js';
import type { PseSubscriptionPaymentDto } from '../dto/subscription-payment.dto.js';

/**
 * SubscriptionsService
 *
 * Manages the full subscription lifecycle:
 * - Trial initiation (7-day free trial)
 * - Subscribe to a plan (with PSE mock payment for paid plans)
 * - Cancel subscription (remains active until period end)
 * - Change plan mid-cycle (new cycle starts)
 * - Handle expired subscriptions (cron-driven downgrade)
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: SubscriptionPlansService,
    private readonly pseMockService: PseMockService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get user's current active/trial subscription.
   * Returns the subscription that is still valid (not fully expired).
   */
  async getActiveSubscription(
    userId: string,
  ): Promise<(Subscription & { plan: SubscriptionPlanConfig }) | null> {
    const now = new Date();

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELLED,
          ],
        },
        endDate: { gt: now },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }

  /**
   * Get the plan config for user's current subscription.
   * If no active subscription, returns the FREE plan config matching user's role.
   */
  async getUserPlanConfig(userId: string): Promise<SubscriptionPlanConfig> {
    const subscription = await this.getActiveSubscription(userId);

    if (subscription) {
      return subscription.plan;
    }

    // No active subscription - return FREE plan for user's role
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Determine plan type based on user's role
    const planType = this.getUserPlanType(user.role);

    return this.plansService.findByTypeAndTier(planType, SubscriptionPlan.FREE);
  }

  /**
   * Start a 7-day trial for a plan.
   * User must not already have an active subscription.
   */
  async startTrial(userId: string, planId: string): Promise<Subscription> {
    // Validate plan exists and is active
    const plan = await this.plansService.findById(planId);

    if (!plan.isActive) {
      throw new BadRequestException('Este plan no esta disponible');
    }

    // Check for existing active subscription
    const existing = await this.getActiveSubscription(userId);
    if (existing) {
      throw new BadRequestException(
        'Ya tienes una suscripcion activa. Cancela o espera a que expire antes de iniciar un trial.',
      );
    }

    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Create trial subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.TRIAL,
        cycle: BillingCycle.MONTHLY,
        startDate: now,
        endDate: trialEnd,
        trialEndsAt: trialEnd,
        autoRenew: false,
      },
    });

    // Update user's subscription plan
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan.tier,
        subscriptionEndsAt: trialEnd,
      },
    });

    this.logger.log(
      `Trial started for user ${userId}, plan ${plan.name}, ends ${trialEnd.toISOString()}`,
    );

    return subscription;
  }

  /**
   * Subscribe to a plan (full flow with payment for paid plans).
   *
   * Flow:
   * 1. Validate plan exists and is active
   * 2. If FREE: create subscription, no payment needed
   * 3. If paid: process PSE mock payment
   * 4. If PSE SUCCESS: create subscription + payment record
   * 5. If PSE FAILURE: throw error
   * 6. If PSE PENDING: create subscription optimistically + pending payment
   * 7. Cancel any existing subscription (mark EXPIRED)
   */
  async subscribe(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<{
    subscription: Subscription;
    paymentResult: {
      transactionId: string;
      status: string;
      message: string;
    } | null;
  }> {
    const plan = await this.plansService.findById(dto.planId);

    if (!plan.isActive) {
      throw new BadRequestException('Este plan no esta disponible');
    }

    const price =
      dto.cycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.annualPrice;

    const now = new Date();
    const endDate = this.calculateEndDate(now, dto.cycle);

    // If FREE plan, no payment needed
    if ((plan.tier as string) === SubscriptionPlan.FREE || price === 0) {
      // Expire existing subscriptions
      await this.expireExistingSubscriptions(userId);

      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: dto.planId,
          status: SubscriptionStatus.ACTIVE,
          cycle: dto.cycle,
          startDate: now,
          endDate,
          autoRenew: true,
        },
      });

      await this.updateUserPlan(userId, plan.tier as SubscriptionPlan, endDate);

      return { subscription, paymentResult: null };
    }

    // Paid plan - requires PSE payment data
    if (!dto.psePaymentData) {
      throw new BadRequestException(
        'Los datos de pago PSE son requeridos para planes pagos',
      );
    }

    // Process PSE mock payment
    const paymentResult = this.processPsePayment(dto.psePaymentData);

    // Handle payment result
    if (paymentResult.status === 'FAILURE') {
      throw new BadRequestException(`Pago rechazado: ${paymentResult.message}`);
    }

    // Expire existing subscriptions
    await this.expireExistingSubscriptions(userId);

    // Create subscription (ACTIVE for SUCCESS, optimistic ACTIVE for PENDING)
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        cycle: dto.cycle,
        startDate: now,
        endDate,
        autoRenew: true,
      },
    });

    // Create payment record
    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: price,
        cycle: dto.cycle,
        pseTransactionId: paymentResult.transactionId,
        status: paymentResult.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        periodStart: now,
        periodEnd: endDate,
      },
    });

    await this.updateUserPlan(userId, plan.tier as SubscriptionPlan, endDate);

    this.logger.log(
      `User ${userId} subscribed to ${plan.name} (${dto.cycle}), payment: ${paymentResult.status}`,
    );

    return { subscription, paymentResult };
  }

  /**
   * Cancel subscription.
   * Marks as CANCELLED, sets cancelledAt, disables auto-renew.
   * Subscription remains active until endDate.
   */
  async cancel(userId: string, reason?: string): Promise<Subscription> {
    const subscription = await this.getActiveSubscription(userId);

    if (!subscription) {
      throw new NotFoundException(
        'No tienes una suscripcion activa para cancelar',
      );
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException(
        'Tu suscripcion ya esta cancelada. Permanecera activa hasta el fin del periodo.',
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelReason: reason ?? null,
        autoRenew: false,
      },
    });

    this.logger.log(
      `Subscription ${subscription.id} cancelled for user ${userId}. Active until ${subscription.endDate.toISOString()}`,
    );

    return updated;
  }

  /**
   * Change plan mid-cycle.
   * 1. Cancel current subscription (set EXPIRED)
   * 2. Create new subscription with new plan
   * 3. New cycle starts now
   * 4. Process payment for new plan via PSE mock
   * 5. Update user.subscriptionPlan
   */
  async changePlan(
    userId: string,
    dto: ChangePlanDto,
  ): Promise<{
    subscription: Subscription;
    paymentResult: {
      transactionId: string;
      status: string;
      message: string;
    } | null;
  }> {
    const newPlan = await this.plansService.findById(dto.newPlanId);

    if (!newPlan.isActive) {
      throw new BadRequestException('El plan seleccionado no esta disponible');
    }

    // Expire current subscription
    await this.expireExistingSubscriptions(userId);

    const price =
      dto.cycle === BillingCycle.MONTHLY
        ? newPlan.monthlyPrice
        : newPlan.annualPrice;

    const now = new Date();
    const endDate = this.calculateEndDate(now, dto.cycle);

    // If new plan is FREE or price is 0
    if ((newPlan.tier as string) === SubscriptionPlan.FREE || price === 0) {
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: dto.newPlanId,
          status: SubscriptionStatus.ACTIVE,
          cycle: dto.cycle,
          startDate: now,
          endDate,
          autoRenew: true,
        },
      });

      await this.updateUserPlan(
        userId,
        newPlan.tier as SubscriptionPlan,
        endDate,
      );
      return { subscription, paymentResult: null };
    }

    // Paid plan - requires PSE payment data
    if (!dto.psePaymentData) {
      throw new BadRequestException(
        'Los datos de pago PSE son requeridos para planes pagos',
      );
    }

    const paymentResult = this.processPsePayment(dto.psePaymentData);

    if (paymentResult.status === 'FAILURE') {
      throw new BadRequestException(`Pago rechazado: ${paymentResult.message}`);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.newPlanId,
        status: SubscriptionStatus.ACTIVE,
        cycle: dto.cycle,
        startDate: now,
        endDate,
        autoRenew: true,
      },
    });

    await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: price,
        cycle: dto.cycle,
        pseTransactionId: paymentResult.transactionId,
        status: paymentResult.status === 'SUCCESS' ? 'SUCCESS' : 'PENDING',
        periodStart: now,
        periodEnd: endDate,
      },
    });

    await this.updateUserPlan(
      userId,
      newPlan.tier as SubscriptionPlan,
      endDate,
    );

    this.logger.log(
      `User ${userId} changed plan to ${newPlan.name} (${dto.cycle}), payment: ${paymentResult.status}`,
    );

    return { subscription, paymentResult };
  }

  /**
   * Handle expired subscriptions (called by cron).
   * Finds subscriptions where endDate < now and status is ACTIVE or CANCELLED.
   * Marks as EXPIRED, downgrades user to FREE, hides excess landlord properties.
   *
   * @returns Number of expired subscriptions processed
   */
  async handleExpiredSubscriptions(): Promise<number> {
    const now = new Date();

    const expiredSubscriptions = await this.prisma.subscription.findMany({
      where: {
        endDate: { lt: now },
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED],
        },
      },
      include: { plan: true },
    });

    if (expiredSubscriptions.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        // Mark subscription as expired
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: SubscriptionStatus.EXPIRED },
        });

        // Determine plan type to find correct FREE plan
        const planType = subscription.plan.planType as PlanType;

        // Downgrade user to FREE
        await this.prisma.user.update({
          where: { id: subscription.userId },
          data: {
            subscriptionPlan: SubscriptionPlan.FREE,
            subscriptionEndsAt: null,
          },
        });

        // For landlords: hide excess properties (keep 1 published, set rest to DRAFT)
        if (planType === PlanType.LANDLORD) {
          await this.hideExcessProperties(subscription.userId);
        }

        // Send expiration notification
        try {
          await this.notificationsService.send({
            userId: subscription.userId,
            templateCode: 'SUBSCRIPTION_EXPIRED',
            variables: {
              planName: subscription.plan.name,
            },
          });
        } catch {
          // Don't fail the expiration process if notification fails
          this.logger.warn(
            `Failed to send expiration notification for user ${subscription.userId}`,
          );
        }

        processedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to expire subscription ${subscription.id}: ${error}`,
        );
      }
    }

    this.logger.log(
      `Processed ${processedCount} expired subscriptions out of ${expiredSubscriptions.length}`,
    );

    return processedCount;
  }

  /**
   * Handle a single subscription/trial expiry.
   * Marks as EXPIRED, downgrades user to FREE, hides excess landlord properties.
   */
  async handleSingleExpiry(subscriptionId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    await this.prisma.user.update({
      where: { id: sub.userId },
      data: {
        subscriptionPlan: SubscriptionPlan.FREE,
        subscriptionEndsAt: null,
      },
    });

    if (sub.plan.planType === PlanType.LANDLORD) {
      await this.hideExcessProperties(sub.userId);
    }
  }

  /**
   * Purchase a single extra scoring view via micropayment.
   * Processes PSE payment for the scoring view price.
   */
  async purchaseScoringView(
    userId: string,
    pseData: PseSubscriptionPaymentDto,
  ): Promise<{
    success: boolean;
    amountPaid: number;
    paymentResult: { transactionId: string; status: string; message: string };
  }> {
    const planConfig = await this.getUserPlanConfig(userId);
    const price = planConfig.scoringViewPrice;

    if (price <= 0) {
      throw new BadRequestException(
        'Tu plan ya incluye vistas de scoring ilimitadas',
      );
    }

    const paymentResult = this.processPsePayment(pseData);

    if (paymentResult.status === 'FAILURE') {
      throw new BadRequestException(`Pago rechazado: ${paymentResult.message}`);
    }

    this.logger.log(
      `Micropayment processed for user ${userId}: $${price} COP, status: ${paymentResult.status}`,
    );

    return {
      success: true,
      amountPaid: price,
      paymentResult: {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
        message: paymentResult.message,
      },
    };
  }

  // ─── Private helpers ──────────────────────────────────────────

  /**
   * Calculate end date based on billing cycle.
   */
  private calculateEndDate(startDate: Date, cycle: BillingCycle): Date {
    const endDate = new Date(startDate);

    if (cycle === BillingCycle.MONTHLY) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return endDate;
  }

  /**
   * Expire all existing active subscriptions for a user.
   */
  private async expireExistingSubscriptions(userId: string): Promise<void> {
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.CANCELLED,
          ],
        },
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });
  }

  /**
   * Update user's subscription plan and end date.
   */
  private async updateUserPlan(
    userId: string,
    tier: SubscriptionPlan,
    endDate: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: tier,
        subscriptionEndsAt: endDate,
      },
    });
  }

  /**
   * Process PSE mock payment using the PseMockService.
   * Adapts subscription PSE data to the PseMockService interface.
   */
  private processPsePayment(pseData: PseSubscriptionPaymentDto): {
    transactionId: string;
    status: string;
    message: string;
    bankName: string;
    timestamp: Date;
  } {
    // PseMockService.processPayment only uses documentNumber and bankCode
    // from the dto, so we can cast the subscription PSE data
    const result = this.pseMockService.processPayment({
      documentNumber: pseData.documentNumber,
      bankCode: pseData.bankCode,
      // Required fields for PseMockRequestDto type but not used in logic
      leaseId: '00000000-0000-0000-0000-000000000000',
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      personType: 'NATURAL',
      documentType: pseData.documentType as 'CC' | 'CE' | 'NIT' | 'PASAPORTE',
      fullName: pseData.holderName,
      email: 'subscription@system.internal',
    } as any);

    return result;
  }

  /**
   * Hide excess properties for a landlord after downgrade.
   * Keeps 1 published property, sets the rest to DRAFT.
   */
  private async hideExcessProperties(userId: string): Promise<void> {
    // Get all published/available properties
    const properties = await this.prisma.property.findMany({
      where: {
        landlordId: userId,
        status: { in: ['AVAILABLE', 'PENDING'] },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (properties.length <= 1) {
      return; // Already within FREE plan limit
    }

    // Keep the first one published, hide the rest
    const propertiesToHide = properties.slice(1).map((p) => p.id);

    await this.prisma.property.updateMany({
      where: {
        id: { in: propertiesToHide },
      },
      data: {
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Hidden ${propertiesToHide.length} excess properties for user ${userId} after downgrade`,
    );
  }

  /**
   * Determine PlanType based on user's role.
   * LANDLORD and AGENT users get LANDLORD plan type (agents manage properties).
   */
  private getUserPlanType(role: string): PlanType {
    if (role === 'LANDLORD' || role === 'AGENT') {
      return PlanType.LANDLORD;
    }
    return PlanType.TENANT;
  }
}
