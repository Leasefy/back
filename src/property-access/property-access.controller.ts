import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { User, PropertyAccess } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { PropertyAccessService } from './property-access.service.js';
import { AssignAgentDto } from './dto/index.js';

/**
 * Controller for managing property agent assignments.
 * Landlords use these endpoints to assign/remove agents from their properties.
 */
@ApiTags('property-agents')
@ApiBearerAuth()
@Controller('properties/:propertyId/agents')
export class PropertyAccessController {
  constructor(private readonly propertyAccessService: PropertyAccessService) {}

  /**
   * Assign an agent to a property by email.
   * The user must have AGENT role and exist in the system.
   */
  @Post()
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Assign an agent to a property' })
  @ApiCreatedResponse({ description: 'Agent assigned successfully' })
  async assignAgent(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: AssignAgentDto,
  ): Promise<PropertyAccess> {
    return this.propertyAccessService.assignAgent(
      landlordId,
      propertyId,
      dto.email,
    );
  }

  /**
   * Get all agents assigned to a property.
   */
  @Get()
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'List agents assigned to a property' })
  @ApiOkResponse({ description: 'List of agents' })
  async getAgents(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<User[]> {
    return this.propertyAccessService.getAgentsForProperty(propertyId);
  }

  /**
   * Remove an agent from a property.
   */
  @Delete(':agentId')
  @Roles(Role.LANDLORD)
  @ApiOperation({ summary: 'Remove an agent from a property' })
  @ApiOkResponse({ description: 'Agent removed successfully' })
  async removeAgent(
    @CurrentUser('id') landlordId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
  ): Promise<{ message: string }> {
    await this.propertyAccessService.removeAgent(
      landlordId,
      propertyId,
      agentId,
    );
    return { message: 'Agente removido exitosamente' };
  }
}
