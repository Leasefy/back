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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { RequireTeamPermission } from '../auth/decorators/require-team-permission.decorator.js';
import { TeamAccessGuard } from '../auth/guards/team-access.guard.js';
import { Role } from '../common/enums/role.enum.js';
import { VisitsService, VisitWithDetails } from './visits.service.js';
import { AvailabilityService } from './availability/availability.service.js';
import { SlotsService, SlotsResponse } from './availability/slots.service.js';
import {
  CreateAvailabilityDto,
  UpdateAvailabilityDto,
  GetSlotsQueryDto,
  CreateVisitDto,
  RescheduleVisitDto,
  RejectVisitDto,
  CancelVisitDto,
} from './dto/index.js';
import type { PropertyAvailability } from '@prisma/client';

/**
 * Controller for property visits management.
 * Handles availability configuration, slot queries, and visit lifecycle.
 */
@ApiTags('visits')
@Controller('visits')
export class VisitsController {
  constructor(
    private readonly visitsService: VisitsService,
    private readonly availabilityService: AvailabilityService,
    private readonly slotsService: SlotsService,
  ) {}

  // ===========================================
  // AVAILABILITY ENDPOINTS (Landlord)
  // ===========================================

  /**
   * Configure availability for property visits.
   * VISIT-01: Landlord can configure availability
   * VISIT-02: Landlord can set visit slot duration
   */
  @Post('properties/:propertyId/availability')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'create')
  @ApiOperation({ summary: 'Configure availability for property visits' })
  @ApiCreatedResponse({ description: 'Availability created' })
  async createAvailability(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: CreateAvailabilityDto,
  ): Promise<PropertyAvailability> {
    return this.availabilityService.create(landlordId, propertyId, dto);
  }

  /**
   * Get availability configuration for a property.
   * Public endpoint - tenants can see when landlord is available.
   */
  @Get('properties/:propertyId/availability')
  @Public()
  @ApiOperation({ summary: 'Get availability configuration for property' })
  @ApiOkResponse({ description: 'Availability configuration' })
  async getAvailability(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<PropertyAvailability[]> {
    return this.availabilityService.findByProperty(propertyId);
  }

  /**
   * Update availability settings.
   */
  @Patch('properties/:propertyId/availability/:availabilityId')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'edit')
  @ApiOperation({ summary: 'Update availability settings' })
  @ApiOkResponse({ description: 'Availability updated' })
  async updateAvailability(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<PropertyAvailability> {
    return this.availabilityService.update(
      landlordId,
      propertyId,
      availabilityId,
      dto,
    );
  }

  /**
   * Delete an availability window.
   */
  @Delete('properties/:propertyId/availability/:availabilityId')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete availability window' })
  @ApiNoContentResponse({ description: 'Availability deleted' })
  async deleteAvailability(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('availabilityId', ParseUUIDPipe) availabilityId: string,
  ): Promise<void> {
    return this.availabilityService.delete(
      landlordId,
      propertyId,
      availabilityId,
    );
  }

  // ===========================================
  // SLOTS ENDPOINTS (Public)
  // ===========================================

  /**
   * Get available time slots for a property.
   * VISIT-03: Tenant can view available slots for a property
   * VISIT-05: System prevents double-booking (occupied slots marked unavailable)
   */
  @Get('properties/:propertyId/slots')
  @Public()
  @ApiOperation({ summary: 'Get available time slots for a property' })
  @ApiOkResponse({ description: 'Available slots' })
  async getAvailableSlots(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query() dto: GetSlotsQueryDto,
  ): Promise<SlotsResponse> {
    return this.slotsService.getAvailableSlots(
      propertyId,
      dto.startDate,
      dto.endDate,
    );
  }

  // ===========================================
  // VISIT REQUEST ENDPOINTS (Tenant)
  // ===========================================

  /**
   * Request a property visit.
   * VISIT-04: Tenant can request a visit
   */
  @Post()
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Request a property visit' })
  @ApiCreatedResponse({ description: 'Visit request created' })
  async createVisit(
    @CurrentUser('id') tenantId: string,
    @Body() dto: CreateVisitDto,
  ): Promise<VisitWithDetails> {
    return this.visitsService.create(tenantId, dto);
  }

  /**
   * Get my scheduled visits.
   * Tenants see visits they requested; landlords see visits on their properties.
   */
  @Get('mine')
  @ApiBearerAuth()
  @Roles(Role.TENANT, Role.LANDLORD)
  @ApiOperation({ summary: 'Get my scheduled visits' })
  @ApiOkResponse({ description: 'List of visits' })
  async getMyVisits(
    @CurrentUser() user: import('@prisma/client').User,
  ): Promise<VisitWithDetails[]> {
    if (user.role === 'LANDLORD') {
      return this.visitsService.findByLandlord(user.id);
    }
    return this.visitsService.findByTenant(user.id);
  }

  /**
   * Reschedule a visit to new date/time.
   * VISIT-08: Tenant can reschedule a pending visit
   */
  @Post(':id/reschedule')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reschedule a visit to new date/time' })
  @ApiCreatedResponse({ description: 'Visit rescheduled, new visit created' })
  async rescheduleVisit(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
    @Body() dto: RescheduleVisitDto,
  ): Promise<VisitWithDetails> {
    return this.visitsService.reschedule(userId, visitId, dto);
  }

  // ===========================================
  // LANDLORD ENDPOINTS
  // ===========================================

  /**
   * Get all visits for my properties.
   * VISIT-12: Landlord can view all visits for their properties
   */
  @Get('landlord')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'view')
  @ApiOperation({ summary: 'Get all visits for my properties' })
  @ApiOkResponse({ description: 'List of visits' })
  async getLandlordVisits(
    @CurrentUser('id') landlordId: string,
  ): Promise<VisitWithDetails[]> {
    return this.visitsService.findByLandlord(landlordId);
  }

  /**
   * Get visits for a specific property.
   */
  @Get('properties/:propertyId')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'view')
  @ApiOperation({ summary: 'Get visits for a specific property' })
  @ApiOkResponse({ description: 'List of visits' })
  async getPropertyVisits(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<VisitWithDetails[]> {
    return this.visitsService.findByProperty(propertyId, landlordId);
  }

  /**
   * Accept a visit request.
   * VISIT-06: Landlord can accept visit request
   */
  @Patch(':id/accept')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'edit')
  @ApiOperation({ summary: 'Accept a visit request' })
  @ApiOkResponse({ description: 'Visit accepted' })
  async acceptVisit(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
  ): Promise<VisitWithDetails> {
    return this.visitsService.accept(landlordId, visitId);
  }

  /**
   * Reject a visit request.
   * VISIT-07: Landlord can reject visit request with reason
   */
  @Patch(':id/reject')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'edit')
  @ApiOperation({ summary: 'Reject a visit request' })
  @ApiOkResponse({ description: 'Visit rejected' })
  async rejectVisit(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
    @Body() dto: RejectVisitDto,
  ): Promise<VisitWithDetails> {
    return this.visitsService.reject(landlordId, visitId, dto.reason);
  }

  /**
   * Mark visit as completed.
   */
  @Patch(':id/complete')
  @ApiBearerAuth()
  @Roles(Role.LANDLORD)
  @UseGuards(TeamAccessGuard)
  @RequireTeamPermission('visits', 'edit')
  @ApiOperation({ summary: 'Mark visit as completed' })
  @ApiOkResponse({ description: 'Visit completed' })
  async completeVisit(
    @CurrentUser('id') landlordId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
  ): Promise<VisitWithDetails> {
    return this.visitsService.complete(landlordId, visitId);
  }

  // ===========================================
  // SHARED ENDPOINTS
  // ===========================================

  /**
   * Get visit details by ID.
   */
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get visit details' })
  @ApiOkResponse({ description: 'Visit details' })
  async getVisit(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
  ): Promise<VisitWithDetails> {
    return this.visitsService.findById(visitId, userId);
  }

  /**
   * Cancel a visit.
   * VISIT-09: Either party can cancel a visit with reason
   */
  @Patch(':id/cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a visit' })
  @ApiOkResponse({ description: 'Visit cancelled' })
  async cancelVisit(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) visitId: string,
    @Body() dto: CancelVisitDto,
  ): Promise<VisitWithDetails> {
    return this.visitsService.cancel(userId, visitId, dto.reason);
  }
}
