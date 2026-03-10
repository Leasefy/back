import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import { TenantProfileDto } from './dto/tenant-profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto.js';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto.js';
import { CreateTeamMemberDto } from './dto/create-team-member.dto.js';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
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
   * Get full tenant profile with aggregated data.
   * Includes user info, preferences, latest application data, and risk score.
   */
  @Get('me/profile')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get full tenant profile (preferences + application data + risk score)' })
  @ApiOkResponse({
    description: 'Aggregated tenant profile retrieved',
    type: TenantProfileDto,
  })
  async getTenantProfile(@CurrentUser('id') userId: string) {
    return this.usersService.getTenantProfile(userId);
  }

  /**
   * Register FCM token for push notifications.
   */
  @Patch('me/fcm-token')
  @ApiOperation({ summary: 'Register FCM token for push notifications' })
  @ApiOkResponse({ description: 'FCM token registered successfully' })
  async registerFcmToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFcmTokenDto,
  ): Promise<{ success: boolean }> {
    await this.usersService.registerFcmToken(userId, dto.fcmToken);
    return { success: true };
  }

  /**
   * Remove FCM token (disable push notifications).
   */
  @Delete('me/fcm-token')
  @ApiOperation({ summary: 'Remove FCM token (disable push notifications)' })
  @ApiOkResponse({ description: 'FCM token removed successfully' })
  async removeFcmToken(
    @CurrentUser('id') userId: string,
  ): Promise<{ success: boolean }> {
    await this.usersService.removeFcmToken(userId);
    return { success: true };
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
      'Updates user profile and sets their role. Call this after Google OAuth to complete registration. ' +
      'For INMOBILIARIA type, also creates the agency and returns it in the response.',
  })
  @ApiOkResponse({
    description: 'Onboarding completed successfully',
    schema: {
      oneOf: [
        {
          description: 'For TENANT, LANDLORD, AGENT: returns the updated user',
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string' },
          },
        },
        {
          description: 'For INMOBILIARIA: returns user + agency + onboardingStep',
          type: 'object',
          properties: {
            user: { type: 'object', properties: { id: { type: 'string' }, email: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string' } } },
            agency: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, nit: { type: 'string' }, city: { type: 'string' } } },
            onboardingStep: { type: 'string', example: 'agency_created' },
          },
        },
      ],
    },
  })
  async completeOnboarding(
    @CurrentUser('id') userId: string,
    @Body() dto: CompleteOnboardingDto,
  ) {
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

  // =========================================================================
  // Password Management
  // =========================================================================

  /**
   * Change the authenticated user's password.
   * Verifies current password before updating.
   */
  @Patch('me/password')
  @ApiOperation({ summary: 'Change user password (verifies current password first)' })
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return this.usersService.changePassword(user.id, user.email, dto);
  }

  // =========================================================================
  // Notification Settings
  // =========================================================================

  /**
   * Get the user's notification settings.
   */
  @Get('me/notification-settings')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiOkResponse({ description: 'Notification settings retrieved' })
  async getNotificationSettings(@CurrentUser('id') userId: string) {
    return this.usersService.getNotificationSettings(userId);
  }

  /**
   * Update notification settings.
   */
  @Patch('me/notification-settings')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiOkResponse({ description: 'Notification settings updated' })
  async updateNotificationSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationSettingsDto,
  ) {
    return this.usersService.updateNotificationSettings(userId, dto);
  }

  // =========================================================================
  // Data Export & Account Deletion
  // =========================================================================

  /**
   * Export all user data as JSON.
   */
  @Post('me/data-export')
  @ApiOperation({ summary: 'Export all user data' })
  @ApiOkResponse({ description: 'User data exported as JSON' })
  async exportData(@CurrentUser('id') userId: string) {
    return this.usersService.exportUserData(userId);
  }

  /**
   * Soft-delete the user's account.
   */
  @Delete('me/account')
  @ApiOperation({ summary: 'Delete user account (soft-delete)' })
  @ApiOkResponse({ description: 'Account deletion initiated' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  // =========================================================================
  // Team Management
  // =========================================================================

  /**
   * List all team members for the authenticated landlord.
   */
  @Get('me/team')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'List team members' })
  @ApiOkResponse({ description: 'Team members list' })
  async getTeamMembers(@CurrentUser('id') userId: string) {
    return this.usersService.getTeamMembers(userId);
  }

  /**
   * Invite a new team member.
   */
  @Post('me/team')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Invite a team member' })
  @ApiOkResponse({ description: 'Team member invited' })
  async createTeamMember(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamMemberDto,
  ) {
    return this.usersService.createTeamMember(userId, dto);
  }

  /**
   * Update a team member's name or role.
   */
  @Patch('me/team/:memberId')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Update team member' })
  @ApiParam({ name: 'memberId', description: 'Team member UUID' })
  @ApiOkResponse({ description: 'Team member updated' })
  async updateTeamMember(
    @CurrentUser('id') userId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.usersService.updateTeamMember(userId, memberId, dto);
  }

  /**
   * Remove a team member.
   */
  @Delete('me/team/:memberId')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Remove team member' })
  @ApiParam({ name: 'memberId', description: 'Team member UUID' })
  @ApiOkResponse({ description: 'Team member removed' })
  async removeTeamMember(
    @CurrentUser('id') userId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.usersService.removeTeamMember(userId, memberId);
  }
}
