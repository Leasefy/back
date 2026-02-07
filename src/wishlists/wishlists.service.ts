import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PropertyStatus } from '../common/enums/index.js';

const PROPERTY_INCLUDE = {
  images: { orderBy: { order: 'asc' as const } },
};

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a property to the user's wishlist.
   * Uses upsert for idempotent behavior (WISH-04).
   * Validates property exists and is not DRAFT.
   */
  async addItem(userId: string, propertyId: string) {
    // Verify property exists and is not a draft
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property || property.status === PropertyStatus.DRAFT) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    // Upsert: create if not exists, no-op if exists (idempotent)
    return this.prisma.wishlistItem.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {}, // No-op on duplicate
      include: {
        property: { include: PROPERTY_INCLUDE },
      },
    });
  }

  /**
   * Remove a property from the user's wishlist.
   * Uses deleteMany for idempotent behavior (no error if not found).
   */
  async removeItem(userId: string, propertyId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, propertyId },
    });
  }

  /**
   * Get all wishlist items for the user with full property data.
   * Ordered by most recently added first.
   */
  async findAll(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        property: { include: PROPERTY_INCLUDE },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
