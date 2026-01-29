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
} from './dto/index.js';

@ApiTags('Applications')
@ApiBearerAuth()
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(Role.TENANT, Role.BOTH)
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
  @Roles(Role.TENANT, Role.BOTH)
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
  @Roles(Role.TENANT, Role.BOTH)
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
  @Roles(Role.TENANT, Role.BOTH)
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
  @Roles(Role.TENANT, Role.BOTH)
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
}
