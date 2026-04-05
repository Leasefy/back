import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PseMockService } from '../tenant-payments/pse-mock/pse-mock.service.js';
import {
  CREDIT_PACK_PRICES,
  type CreditPackSize,
} from './constants/credit-packs.js';
import type { BuyCreditsDto } from './dto/buy-credits.dto.js';

@Injectable()
export class AgentCreditsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pseMockService: PseMockService,
  ) {}

  async getBalance(userId: string) {
    const credit = await this.prisma.agentCredit.findUnique({
      where: { userId },
    });
    return { balance: credit?.balance ?? 0 };
  }

  async purchaseCredits(userId: string, dto: BuyCreditsDto) {
    const packPrice = CREDIT_PACK_PRICES[dto.packSize as CreditPackSize];
    if (!packPrice) {
      throw new BadRequestException('Pack de creditos invalido');
    }

    const paymentResult = this.pseMockService.processPayment({
      documentNumber: dto.psePaymentData.documentNumber,
      bankCode: dto.psePaymentData.bankCode,
      leaseId: '00000000-0000-0000-0000-000000000000',
      periodMonth: new Date().getMonth() + 1,
      periodYear: new Date().getFullYear(),
      personType: 'NATURAL',
      documentType: dto.psePaymentData.documentType as
        | 'CC'
        | 'CE'
        | 'NIT'
        | 'PASAPORTE',
      fullName: dto.psePaymentData.holderName,
      email: 'credits@system.internal',
    } as any);

    if (paymentResult.status === 'FAILURE') {
      throw new BadRequestException(
        `Pago PSE rechazado: ${paymentResult.message}`,
      );
    }

    // SUCCESS or PENDING — optimistic grant (same pattern as subscriptions)
    const credit = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.agentCredit.upsert({
        where: { userId },
        create: { userId, balance: dto.packSize },
        update: { balance: { increment: dto.packSize } },
      });

      await tx.agentCreditTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: dto.packSize,
          balanceAfter: updated.balance,
          pseTransactionId: paymentResult.transactionId,
          amountPaidCop: packPrice,
          description: `Compra de ${dto.packSize} credito${dto.packSize > 1 ? 's' : ''} via PSE`,
        },
      });

      return updated;
    });

    return {
      balance: credit.balance,
      creditsAdded: dto.packSize,
      payment: {
        transactionId: paymentResult.transactionId,
        status: paymentResult.status,
      },
    };
  }

  async getTransactionHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.agentCreditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          pseTransactionId: true,
          amountPaidCop: true,
          applicationId: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.agentCreditTransaction.count({ where: { userId } }),
    ]);

    const credit = await this.prisma.agentCredit.findUnique({
      where: { userId },
      select: { balance: true },
    });

    return {
      balance: credit?.balance ?? 0,
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deductCredits(
    userId: string,
    amount: number,
    applicationId: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Atomic conditional decrement — prevents double-spend
      const updated = await tx.agentCredit.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });

      if (updated.count === 0) {
        return false;
      }

      const credit = await tx.agentCredit.findUniqueOrThrow({
        where: { userId },
      });

      await tx.agentCreditTransaction.create({
        data: {
          userId,
          type: 'DEDUCTION',
          amount,
          balanceAfter: credit.balance,
          applicationId,
          description: `Credito de evaluacion usado para solicitud ${applicationId}`,
        },
      });

      return true;
    });
  }
}
