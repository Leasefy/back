import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  ForbiddenException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiForbiddenResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { AgencyMemberRole } from '../../common/enums/agency-member-role.enum.js';
import { AgencyService } from './agency.service.js';
import {
  CreateAgencyDto,
  UpdateAgencyDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  UpdateMemberProfileDto,
  UpdatePermissionsDto,
  InvitationInfoResponseDto,
} from './dto/index.js';

/**
 * Controller for agency management within the inmobiliaria module.
 * All endpoints require authentication (global SupabaseAuthGuard).
 */
@ApiTags('inmobiliaria/agency')
@ApiBearerAuth()
@Controller('inmobiliaria/agency')
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  /**
   * POST /inmobiliaria/agency
   * Create a new agency. Any authenticated user can create one.
   * The creator is automatically added as ADMIN member.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new agency' })
  @ApiCreatedResponse({ description: 'Agency created successfully' })
  async createAgency(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAgencyDto,
  ) {
    return this.agencyService.createAgency(userId, dto);
  }

  /**
   * GET /inmobiliaria/agency
   * Get the current user's agency with member count.
   */
  @Get()
  @ApiOperation({ summary: 'Get current user agency' })
  @ApiOkResponse({ description: 'Agency details with member count' })
  async getMyAgency(@CurrentUser('id') userId: string) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    return agency;
  }

  /**
   * PUT /inmobiliaria/agency
   * Update agency configuration. Admin only.
   */
  @Put()
  @ApiOperation({ summary: 'Update agency configuration (admin only)' })
  @ApiOkResponse({ description: 'Agency updated successfully' })
  async updateAgency(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAgencyDto,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.updateAgency(agency.id, dto);
  }

  /**
   * GET /inmobiliaria/agency/members
   * List all members of the user's agency.
   */
  @Get('members')
  @ApiOperation({ summary: 'List agency members' })
  @ApiOkResponse({ description: 'List of agency members' })
  async getMembers(@CurrentUser('id') userId: string) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    return this.agencyService.getMembers(agency.id);
  }

  /**
   * POST /inmobiliaria/agency/members
   * Invite a member to the agency. Admin only.
   */
  @Post('members')
  @ApiOperation({ summary: 'Invite a member to the agency (admin only)' })
  @ApiCreatedResponse({ description: 'Member invited successfully' })
  async inviteMember(
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.inviteMember(agency.id, dto);
  }

  /**
   * GET /inmobiliaria/agency/onboarding-status
   * Returns onboarding checklist for the current user's agency.
   */
  @Get('onboarding-status')
  @ApiOperation({ summary: 'Get agency onboarding checklist status' })
  @ApiOkResponse({ description: 'Onboarding checklist with completion percent' })
  async getOnboardingStatus(@CurrentUser('id') userId: string) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    return this.agencyService.getOnboardingStatus(agency.id);
  }

  /**
   * GET /inmobiliaria/agency/invitations/:token
   * Public endpoint — returns invitation info without requiring auth.
   */
  @Public()
  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get invitation info by token (public)' })
  @ApiOkResponse({ type: InvitationInfoResponseDto })
  async getInvitationByToken(
    @Param('token') token: string,
  ): Promise<InvitationInfoResponseDto> {
    const member = await this.agencyService.getInvitationByToken(token);
    return {
      agencyName: member.agency.name,
      agencyCity: member.agency.city ?? '',
      role: member.role,
      invitedEmail: member.invitedEmail ?? '',
      expiresAt: member.invitationExpiresAt!,
    };
  }

  /**
   * POST /inmobiliaria/agency/invitations/:token/accept
   * Accept an invitation. Requires authentication.
   */
  @Post('invitations/:token/accept')
  @ApiOperation({ summary: 'Accept agency invitation (requires auth)' })
  @ApiOkResponse({ description: 'Invitation accepted — member is now ACTIVE' })
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.agencyService.acceptInvitation(token, userId);
  }

  /**
   * POST /inmobiliaria/agency/invitations/:token/decline
   * Decline an invitation. Public — invitee may not be logged in.
   */
  @Public()
  @Post('invitations/:token/decline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decline agency invitation (public)' })
  @ApiOkResponse({ description: 'Invitation declined' })
  async declineInvitation(@Param('token') token: string) {
    return this.agencyService.declineInvitation(token);
  }

  /**
   * POST /inmobiliaria/agency/members/:memberId/resend-invitation
   * Resend invitation to a pending member. Admin only.
   */
  @Post('members/:memberId/resend-invitation')
  @ApiOperation({ summary: 'Resend invitation to pending member (admin only)' })
  @ApiOkResponse({ description: 'New invitation token generated' })
  async resendInvitation(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.resendInvitation(memberId, agency.id);
  }

  /**
   * PUT /inmobiliaria/agency/members/:memberId/role
   * Update a member's role. Admin only.
   */
  @Put('members/:memberId/role')
  @ApiOperation({ summary: 'Update member role (admin only)' })
  @ApiOkResponse({ description: 'Member role updated' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.updateMemberRole(agency.id, memberId, dto);
  }

  /**
   * PATCH /inmobiliaria/agency/members/:memberId/profile
   * Update a member's display profile (position/title). Admin only.
   */
  @Patch('members/:memberId/profile')
  @ApiOperation({ summary: 'Update member profile/title (admin only)' })
  @ApiOkResponse({ description: 'Member profile updated' })
  async updateMemberProfile(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberProfileDto,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.updateMemberProfile(agency.id, memberId, dto);
  }

  /**
   * GET /inmobiliaria/agency/members/:memberId/permissions
   * Get effective permissions for a member (custom or role defaults). Admin only.
   */
  @Get('members/:memberId/permissions')
  @ApiOperation({
    summary: 'Get member effective permissions (admin only)',
    description:
      'Returns the effective permissions for the given member. ' +
      'If the member has custom permissions set, those are returned. ' +
      'Otherwise, returns the role defaults. ADMIN members always have full access (FULL_ACCESS).',
  })
  @ApiParam({ name: 'memberId', description: 'Agency member UUID', type: 'string', format: 'uuid' })
  @ApiOkResponse({
    description: 'Effective permissions for the member',
    schema: {
      type: 'object',
      properties: {
        memberId: { type: 'string', format: 'uuid' },
        role: { type: 'string', enum: ['ADMIN', 'AGENTE', 'CONTADOR', 'VIEWER'] },
        permissions: {
          oneOf: [
            { type: 'string', example: 'FULL_ACCESS', description: 'For ADMIN role' },
            {
              type: 'object',
              description: 'Module-action permission map',
              properties: {
                dashboard: { type: 'array', items: { type: 'string' } },
                portafolio: { type: 'array', items: { type: 'string' } },
                pipeline: { type: 'array', items: { type: 'string' } },
                cobros: { type: 'array', items: { type: 'string' } },
                dispersiones: { type: 'array', items: { type: 'string' } },
                reportes: { type: 'array', items: { type: 'string' } },
                configuracion: { type: 'array', items: { type: 'string' } },
                analytics: { type: 'array', items: { type: 'string' } },
              },
            },
          ],
        },
        source: { type: 'string', enum: ['custom', 'role_defaults'], description: 'Where permissions come from' },
      },
    },
  })
  @ApiForbiddenResponse({ description: 'Requester is not an ADMIN of this agency' })
  async getMemberPermissions(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.getMemberPermissions(agency.id, memberId);
  }

  /**
   * PUT /inmobiliaria/agency/members/:memberId/permissions
   * Update granular permissions for a member. Admin only.
   * Pass null as permissions to reset to role defaults.
   */
  @Put('members/:memberId/permissions')
  @ApiOperation({
    summary: 'Update member permissions (admin only)',
    description:
      'Set custom granular permissions per module+action. ' +
      'Pass null as the permissions field to reset to role defaults. ' +
      'Omitted modules are treated as no access. ' +
      'Valid actions: view, create, edit, delete, export.',
  })
  @ApiParam({ name: 'memberId', description: 'Agency member UUID', type: 'string', format: 'uuid' })
  @ApiBody({
    description: 'Permissions to set. Use null to reset to role defaults.',
    schema: {
      type: 'object',
      properties: {
        permissions: {
          nullable: true,
          description: 'Custom permissions map. null = reset to role defaults.',
          type: 'object',
          example: {
            dashboard: ['view'],
            portafolio: ['view', 'create', 'edit'],
            reportes: ['view', 'export'],
            configuracion: [],
          },
        },
      },
    },
  })
  @ApiOkResponse({ description: 'Updated agency member with new permissions applied' })
  @ApiForbiddenResponse({ description: 'Requester is not an ADMIN of this agency' })
  async updateMemberPermissions(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdatePermissionsDto,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.updateMemberPermissions(
      agency.id,
      memberId,
      dto.permissions,
    );
  }

  /**
   * DELETE /inmobiliaria/agency/members/:memberId
   * Remove a member from the agency. Admin only.
   */
  @Delete('members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from agency (admin only)' })
  @ApiNoContentResponse({ description: 'Member removed' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    await this.agencyService.removeMember(agency.id, memberId);
  }

  /**
   * GET /inmobiliaria/agency/integrations
   * List integrations for the user's agency.
   */
  @Get('integrations')
  @ApiOperation({ summary: 'List agency integrations' })
  @ApiOkResponse({ description: 'List of integrations' })
  async getIntegrations(@CurrentUser('id') userId: string) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    return this.agencyService.getIntegrations(agency.id);
  }

  /**
   * PUT /inmobiliaria/agency/integrations/:integrationId
   * Toggle an integration's enabled status. Admin only.
   */
  @Put('integrations/:integrationId')
  @ApiOperation({ summary: 'Toggle integration (admin only)' })
  @ApiOkResponse({ description: 'Integration updated' })
  async updateIntegration(
    @CurrentUser('id') userId: string,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Body() data: { isEnabled: boolean },
  ) {
    const agency = await this.agencyService.getAgencyForUser(userId);
    if (!agency) {
      throw new NotFoundException('You are not a member of any agency');
    }
    this.ensureAdmin(agency.memberRole as AgencyMemberRole);
    return this.agencyService.updateIntegration(
      agency.id,
      integrationId,
      data,
    );
  }

  /**
   * Verify the member has ADMIN role. Throws ForbiddenException otherwise.
   */
  private ensureAdmin(role: AgencyMemberRole): void {
    if (role !== AgencyMemberRole.ADMIN) {
      throw new ForbiddenException(
        'Only agency administrators can perform this action',
      );
    }
  }
}
