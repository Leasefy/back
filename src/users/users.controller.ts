import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SwitchRoleDto } from './dto/switch-role.dto.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
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
   * @deprecated Role switching is no longer supported.
   * This endpoint is kept for backward compatibility but returns an error.
   */
  @Patch('me/role')
  @ApiOperation({
    summary: 'Switch active role (deprecated)',
    deprecated: true,
    description: 'Role switching is no longer supported. Users have a single role.',
  })
  @ApiOkResponse({ description: 'This endpoint is deprecated and will return an error' })
  async switchRole(
    @CurrentUser('id') userId: string,
    @Body() dto: SwitchRoleDto,
  ): Promise<User> {
    return this.usersService.setActiveRole(userId, dto.activeRole);
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
