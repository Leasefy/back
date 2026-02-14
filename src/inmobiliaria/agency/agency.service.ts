import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';
import { CreateAgencyDto } from './dto/create-agency.dto.js';
import { UpdateAgencyDto } from './dto/update-agency.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';

@Injectable()
export class AgencyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new agency and auto-add the creator as ADMIN member.
   */
  async createAgency(userId: string, dto: CreateAgencyDto) {
    return this.prisma.agency.create({
      data: {
        name: dto.name,
        nit: dto.nit,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        email: dto.email,
        defaultCommissionPercent: dto.defaultCommissionPercent ?? 10,
        members: {
          create: {
            userId,
            role: AgencyMemberRole.ADMIN,
            status: AgencyMemberStatus.ACTIVE,
          },
        },
      },
      include: {
        members: true,
      },
    });
  }

  /**
   * Get agency by ID with member count.
   */
  async getAgency(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        _count: {
          select: {
            members: {
              where: { status: AgencyMemberStatus.ACTIVE },
            },
          },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    return agency;
  }

  /**
   * Update agency configuration.
   */
  async updateAgency(agencyId: string, dto: UpdateAgencyDto) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    return this.prisma.agency.update({
      where: { id: agencyId },
      data: {
        ...dto,
      },
    });
  }

  /**
   * List all members of an agency with user email and name.
   */
  async getMembers(agencyId: string) {
    return this.prisma.agencyMember.findMany({
      where: { agencyId },
      include: {
        agency: false,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Invite a member to the agency by email.
   * Finds the user by email and creates an AgencyMember with INVITED status.
   * Throws NotFoundException if the user does not exist in the platform.
   */
  async inviteMember(agencyId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new NotFoundException(
        `User with email ${dto.email} not found on the platform`,
      );
    }

    // Check if user is already a member
    const existing = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId, userId: user.id } },
    });

    if (existing) {
      if (existing.status === AgencyMemberStatus.INACTIVE) {
        // Re-activate inactive member
        return this.prisma.agencyMember.update({
          where: { id: existing.id },
          data: {
            role: dto.role,
            status: AgencyMemberStatus.INVITED,
          },
        });
      }
      throw new ConflictException(
        `User ${dto.email} is already a member of this agency`,
      );
    }

    return this.prisma.agencyMember.create({
      data: {
        agencyId,
        userId: user.id,
        role: dto.role,
        status: AgencyMemberStatus.INVITED,
      },
    });
  }

  /**
   * Update a member's role within the agency.
   */
  async updateMemberRole(
    agencyId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
  ) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in this agency`,
      );
    }

    return this.prisma.agencyMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });
  }

  /**
   * Remove a member by setting their status to INACTIVE.
   */
  async removeMember(agencyId: string, memberId: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in this agency`,
      );
    }

    return this.prisma.agencyMember.update({
      where: { id: memberId },
      data: { status: AgencyMemberStatus.INACTIVE },
    });
  }

  /**
   * Get the agency where the user is an active member.
   * Returns the first agency found (a user should belong to at most one).
   */
  async getAgencyForUser(userId: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: {
        userId,
        status: { in: [AgencyMemberStatus.ACTIVE, AgencyMemberStatus.INVITED] },
      },
      include: {
        agency: {
          include: {
            _count: {
              select: {
                members: {
                  where: { status: AgencyMemberStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      return null;
    }

    return {
      ...member.agency,
      memberRole: member.role,
      memberStatus: member.status,
    };
  }

  /**
   * List integrations for an agency.
   */
  async getIntegrations(agencyId: string) {
    return this.prisma.agencyIntegration.findMany({
      where: { agencyId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Toggle an integration's enabled status.
   */
  async updateIntegration(
    agencyId: string,
    integrationId: string,
    data: { isEnabled: boolean },
  ) {
    const integration = await this.prisma.agencyIntegration.findFirst({
      where: { id: integrationId, agencyId },
    });

    if (!integration) {
      throw new NotFoundException(
        `Integration with ID ${integrationId} not found for this agency`,
      );
    }

    return this.prisma.agencyIntegration.update({
      where: { id: integrationId },
      data: { isEnabled: data.isEnabled },
    });
  }
}
