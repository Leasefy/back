import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Prisma } from '@prisma/client';
import type { Property, PropertyImage } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { PropertyStatus } from '../common/enums/index.js';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  FilterPropertiesDto,
  PaginatedPropertiesResponse,
  PaginationMeta,
} from './dto/index.js';
import {
  NaturalSearchParserService,
  ParsedSearchFilters,
} from './services/natural-search-parser.service.js';

/**
 * Valid amenity IDs for property listings.
 * Must match frontend AMENITIES_OPTIONS in publish.ts
 */
const VALID_AMENITIES = new Set([
  'pool',       // Piscina
  'gym',        // Gimnasio
  'security',   // Vigilancia 24/7
  'parking',    // Parqueadero
  'elevator',   // Ascensor
  'terrace',    // Terraza
  'bbq',        // Zona BBQ
  'playground', // Zona infantil
  'laundry',    // Lavandería
  'pets',       // Acepta mascotas
  'furnished',  // Amoblado
  'balcony',    // Balcón
  'storage',    // Depósito
  'ac',         // Aire acondicionado
  'heating',    // Calefacción
]);

/**
 * Service for property operations.
 * Handles CRUD operations, ownership validation, public listing, and image management.
 */
@Injectable()
export class PropertiesService {
  private supabase: SupabaseClient;

  private readonly BUCKET_NAME = 'property-images';
  private readonly MAX_IMAGES = 10;
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly naturalSearchParser: NaturalSearchParserService,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

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
   * Supports both explicit filters and natural language parsing.
   */
  private buildPublicWhereClause(
    filters: FilterPropertiesDto,
  ): Prisma.PropertyWhereInput {
    // Parse natural query if provided
    let parsedFilters: ParsedSearchFilters = {};
    if (filters.naturalQuery) {
      parsedFilters = this.naturalSearchParser.parse(filters.naturalQuery);
    }

    const where: Prisma.PropertyWhereInput = {
      // Exclude drafts from public listing
      status: { not: PropertyStatus.DRAFT },
    };

    // City: explicit filter takes precedence over parsed
    const city = filters.city ?? parsedFilters.city;
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    // Neighborhood: explicit filter takes precedence
    const neighborhood = filters.neighborhood ?? parsedFilters.neighborhood;
    if (neighborhood) {
      where.neighborhood = { contains: neighborhood, mode: 'insensitive' };
    }

    // Price range: merge explicit and parsed
    const minPrice = filters.minPrice ?? parsedFilters.minPrice;
    const maxPrice = filters.maxPrice ?? parsedFilters.maxPrice;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.monthlyRent = {};
      if (minPrice !== undefined) {
        where.monthlyRent.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.monthlyRent.lte = maxPrice;
      }
    }

    // Bedrooms: explicit takes precedence
    const bedrooms = filters.bedrooms ?? parsedFilters.bedrooms;
    if (bedrooms !== undefined) {
      where.bedrooms = bedrooms;
    }

    // Bathrooms: explicit takes precedence
    const bathrooms = filters.bathrooms ?? parsedFilters.bathrooms;
    if (bathrooms !== undefined) {
      where.bathrooms = bathrooms;
    }

    // Property type: explicit takes precedence
    const propertyType = filters.propertyType ?? parsedFilters.propertyType;
    if (propertyType) {
      where.type = propertyType;
    }

    // Parking spaces: explicit takes precedence (minimum)
    const parkingSpaces = filters.parkingSpaces ?? parsedFilters.parkingSpaces;
    if (parkingSpaces !== undefined) {
      where.parkingSpaces = { gte: parkingSpaces };
    }

    // Stratum: explicit takes precedence
    const stratum = filters.stratum ?? parsedFilters.stratum;
    if (stratum !== undefined) {
      where.stratum = stratum;
    }

    // Area range: explicit takes precedence
    const minArea = filters.minArea ?? parsedFilters.minArea;
    const maxArea = filters.maxArea ?? parsedFilters.maxArea;
    if (minArea !== undefined || maxArea !== undefined) {
      where.area = {};
      if (minArea !== undefined) {
        where.area.gte = minArea;
      }
      if (maxArea !== undefined) {
        where.area.lte = maxArea;
      }
    }

    // Floor: explicit takes precedence
    const floor = filters.floor ?? parsedFilters.floor;
    if (floor !== undefined) {
      where.floor = floor;
    }

    // Amenities: merge explicit and parsed (remove duplicates)
    const amenities = [
      ...(filters.amenities ?? []),
      ...(parsedFilters.amenities ?? []),
    ];
    const uniqueAmenities = [...new Set(amenities)];
    if (uniqueAmenities.length > 0) {
      where.amenities = { hasEvery: uniqueAmenities };
    }

    // Full-text search: use searchQuery OR remaining text from natural query
    const searchText = filters.searchQuery ?? parsedFilters.remainingText;
    if (searchText && searchText.trim().length > 0) {
      where.OR = [
        { title: { contains: searchText, mode: 'insensitive' } },
        { description: { contains: searchText, mode: 'insensitive' } },
        { address: { contains: searchText, mode: 'insensitive' } },
        { neighborhood: { contains: searchText, mode: 'insensitive' } },
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

  // ===========================================
  // IMAGE MANAGEMENT
  // ===========================================

  /**
   * Upload an image to a property.
   * Max 10 images per property. Allowed: jpg, png, webp. Max size: 5MB.
   */
  async uploadImage(
    propertyId: string,
    landlordId: string,
    file: Express.Multer.File,
  ): Promise<PropertyImage> {
    const property = await this.findByIdOrThrow(propertyId);
    this.ensureOwnership(property, landlordId);

    // Check current image count
    const imageCount = await this.prisma.propertyImage.count({
      where: { propertyId },
    });

    if (imageCount >= this.MAX_IMAGES) {
      throw new BadRequestException(
        `Maximum ${this.MAX_IMAGES} images allowed per property`,
      );
    }

    // Validate file type
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, and WebP images are allowed');
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('Image must be less than 5MB');
    }

    // Generate unique filename
    const ext = file.originalname.split('.').pop();
    const filename = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new BadRequestException(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filename);

    // Create database record
    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        url: urlData.publicUrl,
        order: imageCount, // Append to end
      },
    });

    return image;
  }

  /**
   * Delete an image from a property.
   * Remaining images are reordered to fill the gap.
   */
  async deleteImage(
    propertyId: string,
    imageId: string,
    landlordId: string,
  ): Promise<void> {
    const property = await this.findByIdOrThrow(propertyId);
    this.ensureOwnership(property, landlordId);

    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }

    // Extract filename from URL for deletion
    const url = new URL(image.url);
    const pathParts = url.pathname.split('/');
    const filename = pathParts.slice(-2).join('/'); // propertyId/filename.ext

    // Delete from storage
    const { error: deleteError } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .remove([filename]);

    if (deleteError) {
      console.error('Failed to delete from storage:', deleteError);
      // Continue to delete from database anyway
    }

    // Delete from database
    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    // Reorder remaining images to fill gap
    const remainingImages = await this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { order: 'asc' },
    });

    for (let i = 0; i < remainingImages.length; i++) {
      if (remainingImages[i].order !== i) {
        await this.prisma.propertyImage.update({
          where: { id: remainingImages[i].id },
          data: { order: i },
        });
      }
    }
  }

  /**
   * Reorder images for a property.
   * First image (index 0) becomes the thumbnail.
   */
  async reorderImages(
    propertyId: string,
    landlordId: string,
    imageIds: string[],
  ): Promise<PropertyImage[]> {
    const property = await this.findByIdOrThrow(propertyId);
    this.ensureOwnership(property, landlordId);

    // Verify all images belong to this property
    const existingImages = await this.prisma.propertyImage.findMany({
      where: { propertyId },
    });

    const existingIds = new Set(existingImages.map((img) => img.id));

    for (const id of imageIds) {
      if (!existingIds.has(id)) {
        throw new BadRequestException(
          `Image ${id} does not belong to this property`,
        );
      }
    }

    // Update order for each image in a transaction
    const updates = imageIds.map((id, index) =>
      this.prisma.propertyImage.update({
        where: { id },
        data: { order: index },
      }),
    );

    await this.prisma.$transaction(updates);

    // Return updated images
    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { order: 'asc' },
    });
  }
}
