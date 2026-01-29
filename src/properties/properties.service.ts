import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Property } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { PropertyStatus } from '../common/enums/index.js';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  FilterPropertiesDto,
  PaginatedPropertiesResponse,
  PaginationMeta,
} from './dto/index.js';

/**
 * Valid amenity IDs for property listings.
 */
const VALID_AMENITIES = new Set([
  'pool',
  'gym',
  'security',
  'parking',
  'elevator',
  'terrace',
  'bbq',
  'playground',
  'laundry',
  'pets',
  'furnished',
  'balcony',
  'storage',
  'ac',
  'heating',
]);

/**
 * Service for property operations.
 * Handles CRUD operations, ownership validation, and public listing.
 */
@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new property for a landlord.
   */
  async create(landlordId: string, dto: CreatePropertyDto): Promise<Property> {
    if (dto.amenities) {
      this.validateAmenities(dto.amenities);
    }

    return this.prisma.property.create({
      data: {
        ...dto,
        landlordId,
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Update a property (only by owner).
   */
  async update(
    propertyId: string,
    landlordId: string,
    dto: UpdatePropertyDto,
  ): Promise<Property> {
    const property = await this.findByIdOrThrow(propertyId);
    this.ensureOwnership(property, landlordId);

    if (dto.amenities) {
      this.validateAmenities(dto.amenities);
    }

    return this.prisma.property.update({
      where: { id: propertyId },
      data: dto,
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Delete a property (only by owner).
   */
  async delete(propertyId: string, landlordId: string): Promise<void> {
    const property = await this.findByIdOrThrow(propertyId);
    this.ensureOwnership(property, landlordId);

    await this.prisma.property.delete({
      where: { id: propertyId },
    });
  }

  /**
   * Get all properties for a landlord.
   */
  async findByLandlord(landlordId: string): Promise<Property[]> {
    return this.prisma.property.findMany({
      where: { landlordId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get property by ID (for internal use).
   */
  async findById(propertyId: string): Promise<Property | null> {
    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Get property by ID or throw NotFoundException.
   */
  async findByIdOrThrow(propertyId: string): Promise<Property> {
    const property = await this.findById(propertyId);
    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }
    return property;
  }

  /**
   * Find public properties with filters (excludes drafts).
   * Supports filtering by city, neighborhood, price range, bedrooms, type, amenities.
   * Supports full-text search on title, description, address, neighborhood.
   */
  async findPublic(
    filters: FilterPropertiesDto,
  ): Promise<PaginatedPropertiesResponse<Property>> {
    const where = this.buildPublicWhereClause(filters);
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const [properties, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
          landlord: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { data: properties, meta };
  }

  /**
   * Get property by ID for public view (excludes drafts unless owner).
   */
  async findPublicById(propertyId: string, userId?: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
        landlord: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    // Draft properties only visible to owner
    if (property.status === PropertyStatus.DRAFT && property.landlordId !== userId) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    return property;
  }

  /**
   * Build Prisma where clause for public property search.
   */
  private buildPublicWhereClause(
    filters: FilterPropertiesDto,
  ): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {
      // Exclude drafts from public listing
      status: { not: PropertyStatus.DRAFT },
    };

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.neighborhood) {
      where.neighborhood = { contains: filters.neighborhood, mode: 'insensitive' };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.monthlyRent = {};
      if (filters.minPrice !== undefined) {
        where.monthlyRent.gte = filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        where.monthlyRent.lte = filters.maxPrice;
      }
    }

    if (filters.bedrooms !== undefined) {
      where.bedrooms = filters.bedrooms;
    }

    if (filters.propertyType) {
      where.type = filters.propertyType;
    }

    if (filters.amenities && filters.amenities.length > 0) {
      // Property must have ALL specified amenities
      where.amenities = { hasEvery: filters.amenities };
    }

    if (filters.searchQuery) {
      // Full-text search across multiple fields using OR
      where.OR = [
        { title: { contains: filters.searchQuery, mode: 'insensitive' } },
        { description: { contains: filters.searchQuery, mode: 'insensitive' } },
        { address: { contains: filters.searchQuery, mode: 'insensitive' } },
        { neighborhood: { contains: filters.searchQuery, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /**
   * Validate that user owns the property.
   */
  private ensureOwnership(property: Property, landlordId: string): void {
    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }
  }

  /**
   * Validate amenity IDs against allowed list.
   */
  private validateAmenities(amenities: string[]): void {
    for (const amenity of amenities) {
      if (!VALID_AMENITIES.has(amenity)) {
        throw new ForbiddenException(`Invalid amenity: ${amenity}`);
      }
    }
  }
}
