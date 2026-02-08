import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UsersService } from './users.service.js';

/**
 * Controller for user profile management.
 * All endpoints require authentication.
 */
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get the authenticated user's profile.
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User profile retrieved successfully' })
  getProfile(@CurrentUser() user: User): User {
    return user;
  }

  /**
   * Get all documents for the authenticated tenant.
   * Aggregates documents from applications, leases, and contract PDFs.
   */
  @Get('me/documents')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get all tenant documents across applications and leases' })
  @ApiResponse({
    status: 200,
    description: 'Tenant document vault with stats',
    schema: {
      type: 'object',
      properties: {
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string', enum: ['contract', 'receipt', 'inventory'] },
              category: { type: 'string' },
              property: { type: 'string' },
              date: { type: 'string', format: 'date-time' },
              size: { type: 'string' },
              status: { type: 'string', enum: ['signed', 'pending', 'available'] },
              sourceType: { type: 'string', enum: ['application', 'lease', 'contract'] },
              sourceId: { type: 'string' },
              documentId: { type: 'string' },
            },
          },
        },
        stats: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            signed: { type: 'number' },
            pending: { type: 'number' },
            available: { type: 'number' },
          },
        },
      },
    },
  })
  async getAllDocuments(@CurrentUser('id') userId: string) {
    return this.usersService.getTenantDocuments(userId);
  }

  /**
   * Save/update tenant search preferences.
   * Creates preferences on first call, updates on subsequent calls (upsert).
   */
  @Patch('me/preferences')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Save/update tenant search preferences' })
  @ApiOkResponse({ description: 'Preferences saved successfully' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(userId, dto);
  }

  /**
   * Get tenant search preferences.
   * Returns null if preferences haven't been set yet.
   */
  @Get('me/preferences')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get tenant search preferences' })
  @ApiOkResponse({ description: 'Tenant preferences retrieved (null if not set)' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.usersService.getPreferences(userId);
  }

  /**
   * Update the authenticated user's profile.
   */
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'User profile updated successfully' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(userId, dto);
  }

  /**
   * Complete user onboarding after Google OAuth registration.
   *
   * This endpoint allows new users to:
   * 1. Set their profile information (firstName, lastName, phone)
   * 2. Select their user type:
   *    - TENANT: Looking to rent a property (inquilino)
   *    - LANDLORD: Has properties to rent out (propietario)
   *
   * The user's role will be updated based on their selection.
   */
  @Post('me/onboarding')
  @ApiOperation({
    summary: 'Complete onboarding after Google registration',
    description:
      'Updates user profile and sets their role. Call this after Google OAuth to complete registration.',
  })
  @ApiOkResponse({ description: 'Onboarding completed successfully' })
  async completeOnboarding(
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteOnboardingDto,
  ): Promise<User> {
    return this.usersService.completeOnboarding(userId, dto);
  }

  /**
   * Check if the current user has completed onboarding.
   * Returns true if the user has a firstName set.
   */
  @Get('me/onboarding/status')
  @ApiOperation({ summary: 'Check if onboarding is complete' })
  @ApiOkResponse({
    description: 'Onboarding status',
    schema: {
      type: 'object',
      properties: {
        complete: { type: 'boolean' },
      },
    },
  })
  async getOnboardingStatus(
    @CurrentUser('id') userId: string,
  ): Promise<{ complete: boolean }> {
    const complete = await this.usersService.isOnboardingComplete(userId);
    return { complete };
  }
}
