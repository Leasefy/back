import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { LandlordPaymentMethod } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  CreateLandlordPaymentMethodDto,
  UpdateLandlordPaymentMethodDto,
} from './dto/index.js';

/**
 * Service for landlord payment method operations.
 * Handles CRUD operations for bank accounts configured by landlords.
 *
 * Requirements: TPAY-01, TPAY-02
 */
@Injectable()
export class LandlordPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment method for landlord.
   *
   * @param landlordId - The ID of the landlord
   * @param dto - The payment method data
   * @returns The created payment method
   */
  async create(
    landlordId: string,
    dto: CreateLandlordPaymentMethodDto,
  ): Promise<LandlordPaymentMethod> {
    return this.prisma.landlordPaymentMethod.create({
      data: {
        landlordId,
        bankName: dto.bankName,
        accountType: dto.accountType,
        accountNumber: dto.accountNumber,
        holderName: dto.holderName,
        holderDocumentNumber: dto.holderDocumentNumber,
        phoneNumber: dto.phoneNumber,
        methodType: dto.methodType,
        instructions: dto.instructions,
      },
    });
  }

  /**
   * Get all payment methods for a landlord.
   * Includes both active and inactive methods.
   * Used by landlord to manage their accounts.
   *
   * @param landlordId - The ID of the landlord
   * @returns List of payment methods ordered by createdAt desc
   */
  async findAllForLandlord(
    landlordId: string,
  ): Promise<LandlordPaymentMethod[]> {
    return this.prisma.landlordPaymentMethod.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single payment method by ID.
   * Verifies ownership before returning.
   *
   * @param methodId - The ID of the payment method
   * @param landlordId - The ID of the landlord (for ownership verification)
   * @returns The payment method
   * @throws NotFoundException if method not found
   * @throws ForbiddenException if not owner
   */
  async findById(
    methodId: string,
    landlordId: string,
  ): Promise<LandlordPaymentMethod> {
    const method = await this.prisma.landlordPaymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this payment method');
    }

    return method;
  }

  /**
   * Update a payment method.
   * Verifies ownership before updating.
   *
   * @param methodId - The ID of the payment method
   * @param landlordId - The ID of the landlord (for ownership verification)
   * @param dto - The update data
   * @returns The updated payment method
   * @throws NotFoundException if method not found
   * @throws ForbiddenException if not owner
   */
  async update(
    methodId: string,
    landlordId: string,
    dto: UpdateLandlordPaymentMethodDto,
  ): Promise<LandlordPaymentMethod> {
    // Verify ownership first
    await this.findById(methodId, landlordId);

    return this.prisma.landlordPaymentMethod.update({
      where: { id: methodId },
      data: {
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.accountType !== undefined && { accountType: dto.accountType }),
        ...(dto.accountNumber !== undefined && {
          accountNumber: dto.accountNumber,
        }),
        ...(dto.holderName !== undefined && { holderName: dto.holderName }),
        ...(dto.holderDocumentNumber !== undefined && {
          holderDocumentNumber: dto.holderDocumentNumber,
        }),
        ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
        ...(dto.methodType !== undefined && { methodType: dto.methodType }),
        ...(dto.instructions !== undefined && {
          instructions: dto.instructions,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Deactivate a payment method (soft delete).
   * Sets isActive = false.
   *
   * @param methodId - The ID of the payment method
   * @param landlordId - The ID of the landlord (for ownership verification)
   * @returns The updated payment method
   * @throws NotFoundException if method not found
   * @throws ForbiddenException if not owner
   */
  async deactivate(
    methodId: string,
    landlordId: string,
  ): Promise<LandlordPaymentMethod> {
    // Verify ownership first
    await this.findById(methodId, landlordId);

    return this.prisma.landlordPaymentMethod.update({
      where: { id: methodId },
      data: { isActive: false },
    });
  }

  /**
   * Delete a payment method (hard delete).
   * Verifies ownership before deleting.
   *
   * @param methodId - The ID of the payment method
   * @param landlordId - The ID of the landlord (for ownership verification)
   * @throws NotFoundException if method not found
   * @throws ForbiddenException if not owner
   */
  async delete(methodId: string, landlordId: string): Promise<void> {
    // Verify ownership first
    await this.findById(methodId, landlordId);

    await this.prisma.landlordPaymentMethod.delete({
      where: { id: methodId },
    });
  }
}
