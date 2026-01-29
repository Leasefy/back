import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { Property } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { PropertiesService } from './properties.service.js';
import {
  CreatePropertyDto,
  UpdatePropertyDto,
  FilterPropertiesDto,
  PaginatedPropertiesResponse,
} from './dto/index.js';

/**
 * Controller for property management.
 * Includes public endpoints for listing and protected endpoints for landlord operations.
 */
@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  // ===========================================
  // PUBLIC ENDPOINTS (no auth required)
  // ===========================================

  /**
   * List all available properties (public, no auth required).
   * Supports filtering by city, price range, bedrooms, type, amenities.
   * Supports full-text search.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List available properties (public)' })
  @ApiOkResponse({ description: 'Paginated list of properties' })
  async findAll(
    @Query() filters: FilterPropertiesDto,
  ): Promise<PaginatedPropertiesResponse<Property>> {
    return this.propertiesService.findPublic(filters);
  }

  // ===========================================
  // LANDLORD ENDPOINTS (auth required)
  // ===========================================

  /**
   * Get all properties owned by the authenticated landlord.
   * Must come BEFORE /:id route to prevent 'mine' matching as :id.
   */
  @Get('mine')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Get my properties' })
  @ApiOkResponse({ description: 'List of landlord properties' })
  async findMine(@CurrentUser('id') landlordId: string): Promise<Property[]> {
    return this.propertiesService.findByLandlord(landlordId);
  }

  /**
   * Get property details by ID (public, no auth required).
   * Draft properties only visible to owner.
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get property details (public)' })
  @ApiOkResponse({ description: 'Property details' })
  async findOne(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') userId?: string,
  ): Promise<Property> {
    return this.propertiesService.findPublicById(propertyId, userId);
  }

  /**
   * Create a new property listing.
   */
  @Post()
  @ApiBearerAuth()
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Create a new property' })
  @ApiCreatedResponse({ description: 'Property created successfully' })
  async create(
    @CurrentUser('id') landlordId: string,
    @Body() dto: CreatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.create(landlordId, dto);
  }

  /**
   * Update a property.
   */
  @Patch(':id')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Update a property' })
  @ApiOkResponse({ description: 'Property updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') landlordId: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(propertyId, landlordId, dto);
  }

  /**
   * Delete a property.
   */
  @Delete(':id')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD, Role.BOTH)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a property' })
  @ApiNoContentResponse({ description: 'Property deleted successfully' })
  async delete(
    @Param('id', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') landlordId: string,
  ): Promise<void> {
    return this.propertiesService.delete(propertyId, landlordId);
  }
}
