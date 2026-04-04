import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { EmailService } from '../../notifications/services/email.service.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyMemberStatus } from '../../common/enums/agency-member-status.enum.js';
import { CreateAgencyDto } from './dto/create-agency.dto.js';
import { UpdateAgencyDto } from './dto/update-agency.dto.js';
import { InviteMemberDto } from './dto/invite-member.dto.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import type { AgencyPermissions } from './permissions/agency-permissions.js';
import { AGENCY_ROLE_DEFAULTS } from './permissions/role-defaults.js';

@Injectable()
export class AgencyService {
  private readonly logger = new Logger(AgencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Create a new agency and auto-add the creator as ADMIN member.
   * Idempotent: if the user already owns an agency as ADMIN, returns it instead of creating a duplicate.
   */
  async createAgency(userId: string, dto: CreateAgencyDto) {
    const existing = await this.prisma.agencyMember.findFirst({
      where: { userId, role: AgencyMemberRole.ADMIN, status: AgencyMemberStatus.ACTIVE },
      select: { agencyId: true },
    });

    if (existing) {
      return this.prisma.agency.findUnique({
        where: { id: existing.agencyId },
        include: { members: true },
      });
    }

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
   * Generates a secure invitation token valid for 7 days.
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

    const invitationToken = crypto.randomUUID();
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Check if user is already a member
    const existing = await this.prisma.agencyMember.findUnique({
      where: { agencyId_userId: { agencyId, userId: user.id } },
    });

    let member;

    if (existing) {
      if (existing.status === AgencyMemberStatus.INACTIVE) {
        // Re-activate inactive member with new token
        member = await this.prisma.agencyMember.update({
          where: { id: existing.id },
          data: {
            role: dto.role,
            status: AgencyMemberStatus.INVITED,
            invitationToken,
            invitationExpiresAt,
            invitedEmail: dto.email,
          },
          include: { agency: true },
        });
      } else {
        throw new ConflictException(
          `User ${dto.email} is already a member of this agency`,
        );
      }
    } else {
      member = await this.prisma.agencyMember.create({
        data: {
          agencyId,
          userId: user.id,
          role: dto.role,
          status: AgencyMemberStatus.INVITED,
          invitationToken,
          invitationExpiresAt,
          invitedEmail: dto.email,
        },
        include: { agency: true },
      });
    }

    // Send invitation email — failure must not break invitation creation
    try {
      await this.emailService.sendAgencyInvitationEmail(
        dto.email,
        member.agency.name,
        member.role,
        invitationToken,
        invitationExpiresAt,
      );
    } catch (err) {
      this.logger.error(
        `Failed to send invitation email to ${dto.email}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return member;
  }

  /**
   * Get invitation details by token.
   * Validates token exists, is not expired, and member is still in INVITED state.
   */
  async getInvitationByToken(token: string) {
    const member = await this.prisma.agencyMember.findUnique({
      where: { invitationToken: token },
      include: { agency: true },
    });

    if (!member) {
      throw new NotFoundException('Invitation token not found or already used');
    }

    if (member.invitationExpiresAt && member.invitationExpiresAt < new Date()) {
      throw new BadRequestException('Invitation token has expired');
    }

    if (member.status !== AgencyMemberStatus.INVITED) {
      throw new BadRequestException(
        'This invitation has already been used or is no longer valid',
      );
    }

    return member;
  }

  /**
   * Accept an invitation by token.
   * Links the authenticated user to the agency member record.
   */
  async acceptInvitation(token: string, userId: string) {
    const member = await this.getInvitationByToken(token);

    // Check if this user is already an active member of this agency
    const alreadyMember = await this.prisma.agencyMember.findFirst({
      where: {
        agencyId: member.agencyId,
        userId,
        id: { not: member.id },
      },
    });

    if (alreadyMember) {
      throw new ConflictException(
        'You are already a member of this agency',
      );
    }

    return this.prisma.agencyMember.update({
      where: { id: member.id },
      data: {
        userId,
        status: AgencyMemberStatus.ACTIVE,
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });
  }

  /**
   * Decline an invitation by token.
   * Sets member status to INACTIVE and clears the token.
   */
  async declineInvitation(token: string) {
    const member = await this.getInvitationByToken(token);

    return this.prisma.agencyMember.update({
      where: { id: member.id },
      data: {
        status: AgencyMemberStatus.INACTIVE,
        invitationToken: null,
        invitationExpiresAt: null,
      },
    });
  }

  /**
   * Resend an invitation by generating a new token for a pending member.
   */
  async resendInvitation(memberId: string, agencyId: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId, status: AgencyMemberStatus.INVITED },
      include: { agency: true },
    });

    if (!member) {
      throw new NotFoundException(
        `Pending invitation with ID ${memberId} not found in this agency`,
      );
    }

    const invitationToken = crypto.randomUUID();
    const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.agencyMember.update({
      where: { id: memberId },
      data: { invitationToken, invitationExpiresAt },
    });

    // Send new invitation email — failure must not break token regeneration
    const recipientEmail = member.invitedEmail;
    if (recipientEmail) {
      try {
        await this.emailService.sendAgencyInvitationEmail(
          recipientEmail,
          member.agency.name,
          member.role,
          invitationToken,
          invitationExpiresAt,
        );
      } catch (err) {
        this.logger.error(
          `Failed to resend invitation email to ${recipientEmail}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return updated;
  }

  /**
   * Get onboarding checklist status for the agency.
   */
  async getOnboardingStatus(agencyId: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      include: {
        members: {
          where: { status: AgencyMemberStatus.ACTIVE },
        },
        _count: {
          select: { consignaciones: true },
        },
      },
    });

    if (!agency) {
      throw new NotFoundException(`Agency with ID ${agencyId} not found`);
    }

    const steps = [
      {
        key: 'agency_created',
        label: 'Agencia creada',
        complete: true,
      },
      {
        key: 'agency_profile',
        label: 'Perfil completo (dirección y NIT)',
        complete: Boolean(agency.address && agency.nit),
      },
      {
        key: 'first_member',
        label: 'Primer miembro invitado',
        complete: agency.members.length > 1,
      },
      {
        key: 'logo_uploaded',
        label: 'Logo subido',
        complete: Boolean(agency.logoUrl),
      },
      {
        key: 'first_property',
        label: 'Primera propiedad registrada',
        complete: agency._count.consignaciones > 0,
      },
    ];

    const completedCount = steps.filter((s) => s.complete).length;
    const completionPercent = Math.round(
      (completedCount / steps.length) * 100,
    );
    const isComplete = completedCount === steps.length;

    return {
      steps,
      completedCount,
      completionPercent,
      isComplete,
    };
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
   * Get effective permissions for an agency member.
   * Returns custom permissions if set, otherwise returns role defaults.
   * Admin members always have full access (indicated by isAdmin: true).
   */
  async getMemberPermissions(agencyId: string, memberId: string) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in this agency`,
      );
    }

    if (member.role === AgencyMemberRole.ADMIN) {
      return {
        memberId,
        role: member.role,
        isAdmin: true,
        permissions: null,
        effectivePermissions: null,
        note: 'ADMIN role has full access to all modules and actions',
      };
    }

    const customPermissions = member.permissions as AgencyPermissions | null;
    const defaultPermissions =
      AGENCY_ROLE_DEFAULTS[
        member.role as Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>
      ] ?? {};

    return {
      memberId,
      role: member.role,
      isAdmin: false,
      permissions: customPermissions,
      effectivePermissions: customPermissions ?? defaultPermissions,
      usingDefaults: customPermissions === null,
    };
  }

  /**
   * Update granular permissions for an agency member.
   * Pass null to reset to role defaults (clears custom permissions).
   * If the passed permissions exactly match the role defaults, also saves null
   * to avoid storing redundant custom data.
   * Only ADMIN can call this — enforced at controller level.
   */
  async updateMemberPermissions(
    agencyId: string,
    memberId: string,
    permissions: AgencyPermissions | null,
  ) {
    const member = await this.prisma.agencyMember.findFirst({
      where: { id: memberId, agencyId },
    });

    if (!member) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in this agency`,
      );
    }

    // If explicit null → clear custom permissions (reset to role defaults)
    // If permissions match role defaults exactly → also clear (no need to store redundant data)
    let resolvedPermissions: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput =
      Prisma.DbNull;

    if (permissions !== null && member.role !== AgencyMemberRole.ADMIN) {
      const roleDefault =
        AGENCY_ROLE_DEFAULTS[
          member.role as Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>
        ];

      const isIdenticalToDefaults =
        roleDefault !== undefined &&
        JSON.stringify(permissions) === JSON.stringify(roleDefault);

      resolvedPermissions = isIdenticalToDefaults
        ? Prisma.DbNull
        : (permissions as Prisma.InputJsonValue);
    }

    return this.prisma.agencyMember.update({
      where: { id: memberId },
      data: {
        permissions: resolvedPermissions,
      },
      select: {
        id: true,
        role: true,
        permissions: true,
      },
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
