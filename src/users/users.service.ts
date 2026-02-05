import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { Role as PrismaRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '../common/enums/role.enum.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';
import type { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';

/**
 * Service for user profile operations.
 * Handles profile retrieval, updates, and role switching.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a user by their ID.
   * @param id - User UUID
   * @returns User object
   * @throws NotFoundException if user doesn't exist
   */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  /**
   * Update user profile information.
   * @param userId - User UUID
   * @param dto - Profile update data (firstName, lastName, phone)
   * @returns Updated user object
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<User> {
    // Ensure user exists first
    await this.findById(userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
    });
  }

  /**
   * @deprecated BOTH role removed. This method is kept for backward compatibility but throws an error.
   * Role switching is no longer supported - users have a single role.
   */
  async setActiveRole(
    _userId: string,
    _activeRole: Role.TENANT | Role.LANDLORD,
  ): Promise<User> {
    throw new ForbiddenException(
      'Role switching is no longer supported. Users have a single role.',
    );
  }

  /**
   * Complete user onboarding after Google OAuth registration.
   *
   * This method:
   * 1. Updates the user's profile (firstName, lastName, phone)
   * 2. Sets the user's role based on their selection
   *
   * @param userId - User UUID
   * @param dto - Onboarding data (name, phone, userType)
   * @returns Updated user object
   *
   * @example
   * // User wants to be a landlord
   * await completeOnboarding(userId, {
   *   firstName: 'Juan',
   *   lastName: 'Garcia',
   *   phone: '+573001234567',
   *   userType: 'LANDLORD'
   * });
   */
  async completeOnboarding(
    userId: string,
    dto: CompleteOnboardingDto,
  ): Promise<User> {
    // Ensure user exists
    await this.findById(userId);

    // Map userType to Role enum
    const role = dto.userType as unknown as Role;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: role as unknown as PrismaRole,
      },
    });
  }

  /**
   * Check if a user has completed onboarding.
   * A user is considered onboarded if they have a firstName set.
   *
   * @param userId - User UUID
   * @returns true if onboarding is complete
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user.firstName !== null && user.firstName.trim() !== '';
  }
}
