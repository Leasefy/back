import { Body, Controller, Get, Patch } from '@nestjs/common';
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
   * Switch the active role for users with BOTH role.
   * Only users with BOTH role can access this endpoint.
   */
  @Patch('me/role')
  @Roles(Role.BOTH)
  @ApiOperation({ summary: 'Switch active role (BOTH users only)' })
  @ApiOkResponse({ description: 'Active role switched successfully' })
  async switchRole(
    @CurrentUser('id') userId: string,
    @Body() dto: SwitchRoleDto,
  ): Promise<User> {
    return this.usersService.setActiveRole(userId, dto.activeRole);
  }
}
