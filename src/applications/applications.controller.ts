import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import type { User } from '@prisma/client';
import {
  CreateApplicationDto,
  PersonalInfoDto,
  EmploymentInfoDto,
  IncomeInfoDto,
  ReferencesDto,
  SubmitApplicationDto,
  WithdrawApplicationDto,
  RespondInfoRequestDto,
} from './dto/index.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Create a new application for a property' })
  @ApiResponse({ status: 201, description: 'Application created' })
  @ApiResponse({ status: 400, description: 'Property not available' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  @ApiResponse({ status: 409, description: 'Already have active application' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.applicationsService.create(user.id, dto);
  }

  @Patch(':id/steps/1')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Update step 1: Personal Information' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Step updated' })
  @ApiResponse({ status: 400, description: 'Application not in DRAFT status' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateStep1(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: PersonalInfoDto,
  ) {
    return this.applicationsService.updateStep(applicationId, user.id, 1, dto);
  }

  @Patch(':id/steps/2')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Update step 2: Employment Information' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Step updated' })
  async updateStep2(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: EmploymentInfoDto,
  ) {
    return this.applicationsService.updateStep(applicationId, user.id, 2, dto);
  }

  @Patch(':id/steps/3')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Update step 3: Income Information' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Step updated' })
  async updateStep3(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: IncomeInfoDto,
  ) {
    return this.applicationsService.updateStep(applicationId, user.id, 3, dto);
  }

  @Patch(':id/steps/4')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Update step 4: References' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Step updated' })
  async updateStep4(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: ReferencesDto,
  ) {
    return this.applicationsService.updateStep(applicationId, user.id, 4, dto);
  }

  @Get('mine')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get all applications for current tenant' })
  @ApiResponse({ status: 200, description: 'List of tenant applications' })
  async findMine(@CurrentUser() user: User) {
    return this.applicationsService.findByTenant(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 403, description: 'Not authorized to view' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.applicationsService.findByIdWithDetails(applicationId, user.id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get application timeline/events' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application timeline' })
  @ApiResponse({ status: 403, description: 'Not authorized to view' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getTimeline(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.applicationsService.getTimeline(applicationId, user.id);
  }

  @Get(':id/info-requests')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get information requests from landlord' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'List of information requests with messages' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getInfoRequests(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.applicationsService.getInfoRequests(applicationId, user.id);
  }

  @Post(':id/submit')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Submit a completed application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application submitted' })
  @ApiResponse({ status: 400, description: 'Incomplete application or invalid transition' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async submit(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: SubmitApplicationDto,
  ) {
    return this.applicationsService.submit(applicationId, user.id, dto);
  }

  @Post(':id/withdraw')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Withdraw an application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application withdrawn' })
  @ApiResponse({ status: 400, description: 'Invalid transition (terminal state)' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async withdraw(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: WithdrawApplicationDto,
  ) {
    return this.applicationsService.withdraw(applicationId, user.id, dto);
  }

  @Post(':id/reactivate')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Reactivate a withdrawn application' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Application reactivated to DRAFT status' })
  @ApiResponse({ status: 400, description: 'Application not in WITHDRAWN status or property unavailable' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 409, description: 'Another active application exists for this property' })
  async reactivate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
  ) {
    return this.applicationsService.reactivate(applicationId, user.id);
  }

  @Post(':id/respond-info')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Respond to landlord info request' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiResponse({ status: 200, description: 'Response recorded' })
  @ApiResponse({ status: 400, description: 'Application not in NEEDS_INFO status' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async respondToInfoRequest(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) applicationId: string,
    @Body() dto: RespondInfoRequestDto,
  ) {
    return this.applicationsService.respondToInfoRequest(applicationId, user.id, dto);
  }
}
