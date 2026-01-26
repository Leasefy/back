import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '../common/enums/role.enum.js';
import type { UpdateProfileDto } from './dto/update-profile.dto.js';

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
   * Set the active role for users with BOTH role.
   * Allows switching between TENANT and LANDLORD context.
   *
   * @param userId - User UUID
   * @param activeRole - Role to switch to (TENANT or LANDLORD)
   * @returns Updated user object
   * @throws ForbiddenException if user doesn't have BOTH role
   */
  async setActiveRole(
    userId: string,
    activeRole: Role.TENANT | Role.LANDLORD,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (user.role !== Role.BOTH) {
      throw new ForbiddenException('Only users with BOTH role can switch roles');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { activeRole },
    });
  }
}
