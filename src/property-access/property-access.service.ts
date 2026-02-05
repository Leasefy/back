import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { PropertyAccess, Property, User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { Role } from '../common/enums/role.enum.js';

/**
 * Service for managing property access delegation to agents.
 * Landlords can grant agents access to manage their properties.
 */
@Injectable()
export class PropertyAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user can access a property.
   * Returns true if user is the landlord OR has active PropertyAccess.
   *
   * @param userId - User UUID
   * @param propertyId - Property UUID
   * @returns true if user can access, false otherwise
   */
  async canAccessProperty(
    userId: string,
    propertyId: string,
  ): Promise<boolean> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });

    if (!property) {
      return false;
    }

    // User is the landlord
    if (property.landlordId === userId) {
      return true;
    }

    // Check if user has active PropertyAccess
    const access = await this.prisma.propertyAccess.findFirst({
      where: {
        propertyId,
        agentId: userId,
        isActive: true,
      },
    });

    return access !== null;
  }

  /**
   * Ensure user can access property, throw if not.
   * Use this in services for authorization checks.
   *
   * @throws ForbiddenException if user cannot access property
   */
  async ensurePropertyAccess(
    userId: string,
    propertyId: string,
  ): Promise<void> {
    const canAccess = await this.canAccessProperty(userId, propertyId);
    if (!canAccess) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }
  }

  /**
   * Get all properties accessible to an agent.
   * Returns properties where agent has active access.
   */
  async getAccessibleProperties(agentId: string): Promise<Property[]> {
    const accessRecords = await this.prisma.propertyAccess.findMany({
      where: {
        agentId,
        isActive: true,
      },
      include: {
        property: {
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return accessRecords.map((record) => record.property);
  }

  /**
   * Assign an agent to a property.
   * The agent must exist and have AGENT role.
   *
   * @param landlordId - ID of the landlord granting access
   * @param propertyId - Property to grant access to
   * @param agentEmail - Email of the agent to assign
   * @throws NotFoundException if agent not found
   * @throws BadRequestException if user is not an agent
   * @throws ForbiddenException if landlord doesn't own property
   */
  async assignAgent(
    landlordId: string,
    propertyId: string,
    agentEmail: string,
  ): Promise<PropertyAccess> {
    // Verify landlord owns the property
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('No eres el propietario de esta propiedad');
    }

    // Find user by email
    const agent = await this.prisma.user.findUnique({
      where: { email: agentEmail },
    });

    if (!agent) {
      throw new NotFoundException(
        `No existe un usuario con el email ${agentEmail}`,
      );
    }

    if (agent.role !== Role.AGENT) {
      throw new BadRequestException(
        `El usuario ${agentEmail} no es un agente. Solo se pueden asignar usuarios con rol AGENT.`,
      );
    }

    // Create or reactivate PropertyAccess
    const existingAccess = await this.prisma.propertyAccess.findUnique({
      where: {
        propertyId_agentId: {
          propertyId,
          agentId: agent.id,
        },
      },
    });

    if (existingAccess) {
      // Reactivate if inactive
      if (!existingAccess.isActive) {
        return this.prisma.propertyAccess.update({
          where: { id: existingAccess.id },
          data: { isActive: true },
          include: {
            agent: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });
      }
      // Already active - return existing
      return this.prisma.propertyAccess.findUnique({
        where: { id: existingAccess.id },
        include: {
          agent: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }) as Promise<PropertyAccess>;
    }

    // Create new access
    return this.prisma.propertyAccess.create({
      data: {
        propertyId,
        agentId: agent.id,
        grantedById: landlordId,
      },
      include: {
        agent: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  /**
   * Remove an agent's access to a property.
   * Soft delete by setting isActive = false.
   */
  async removeAgent(
    landlordId: string,
    propertyId: string,
    agentId: string,
  ): Promise<void> {
    // Verify landlord owns the property
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('No eres el propietario de esta propiedad');
    }

    const access = await this.prisma.propertyAccess.findUnique({
      where: {
        propertyId_agentId: {
          propertyId,
          agentId,
        },
      },
    });

    if (!access) {
      throw new NotFoundException('El agente no tiene acceso a esta propiedad');
    }

    await this.prisma.propertyAccess.update({
      where: { id: access.id },
      data: { isActive: false },
    });
  }

  /**
   * Get all agents assigned to a property.
   */
  async getAgentsForProperty(propertyId: string): Promise<User[]> {
    const accessRecords = await this.prisma.propertyAccess.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      include: {
        agent: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    return accessRecords.map((record) => record.agent) as User[];
  }

  /**
   * Get landlord info for a property the agent manages.
   * Agent must have active access to the property.
   */
  async getLandlordForManagedProperty(
    agentId: string,
    propertyId: string,
  ): Promise<User> {
    const access = await this.prisma.propertyAccess.findFirst({
      where: {
        propertyId,
        agentId,
        isActive: true,
      },
      include: {
        grantedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!access) {
      throw new ForbiddenException('No tienes acceso a esta propiedad');
    }

    return access.grantedBy as User;
  }
}
