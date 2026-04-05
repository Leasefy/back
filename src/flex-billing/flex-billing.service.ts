import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import type { ReportCanonDto } from './dto/report-canon.dto.js';
import type { FlexBillingDashboardDto } from './dto/flex-billing-dashboard.dto.js';

@Injectable()
export class FlexBillingService {
  private readonly logger = new Logger(FlexBillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerPsePayment(
    agencyId: string,
    consignacionId: string,
    canonAmount: number,
    month: string,
    pseTransactionId?: string,
  ) {
    const leasifyFee = Math.round(canonAmount * 0.01);

    const record = await this.prisma.canonTracking.upsert({
      where: { consignacionId_month: { consignacionId, month } },
      create: {
        agencyId,
        consignacionId,
        canonAmount,
        leasifyFee,
        month,
        source: 'PSE_AUTO',
        pseTransactionId,
      },
      update: {
        canonAmount,
        leasifyFee,
        pseTransactionId,
      },
    });

    this.logger.log(
      `Canon tracked: agency=${agencyId} consignacion=${consignacionId} month=${month} amount=${canonAmount} fee=${leasifyFee}`,
    );

    return record;
  }

  async reportManualCanon(
    agencyId: string,
    userId: string,
    dto: ReportCanonDto,
  ) {
    const consignacion = await this.prisma.consignacion.findFirst({
      where: { id: dto.consignacionId, agencyId },
    });

    if (!consignacion) {
      throw new NotFoundException(
        'Consignacion no encontrada en esta agencia',
      );
    }

    const leasifyFee = Math.round(dto.canonAmount * 0.01);

    return this.prisma.canonTracking.upsert({
      where: {
        consignacionId_month: {
          consignacionId: dto.consignacionId,
          month: dto.month,
        },
      },
      create: {
        agencyId,
        consignacionId: dto.consignacionId,
        canonAmount: dto.canonAmount,
        leasifyFee,
        month: dto.month,
        source: 'MANUAL',
        reportedByUserId: userId,
        paymentReference: dto.paymentReference,
      },
      update: {
        canonAmount: dto.canonAmount,
        leasifyFee,
        source: 'MANUAL',
        reportedByUserId: userId,
        paymentReference: dto.paymentReference,
      },
    });
  }

  async getDashboard(
    agencyId: string,
    year?: number,
  ): Promise<FlexBillingDashboardDto> {
    const where: Prisma.CanonTrackingWhereInput = year
      ? { agencyId, month: { startsWith: `${year}-` } }
      : { agencyId };

    const [aggregate, count, history] = await Promise.all([
      this.prisma.canonTracking.aggregate({
        where,
        _sum: { canonAmount: true, leasifyFee: true },
      }),
      this.prisma.canonTracking.count({ where }),
      this.prisma.canonTracking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
    ]);

    const canonTotal = aggregate._sum.canonAmount ?? 0;
    const leasifyFeeTotal = aggregate._sum.leasifyFee ?? 0;

    return {
      canonTotal,
      leasifyFeeTotal,
      estimatedCharge: leasifyFeeTotal,
      recordCount: count,
      history,
    };
  }
}
