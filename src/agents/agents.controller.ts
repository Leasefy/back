import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { User, Property } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { PropertyAccessService } from '../property-access/property-access.service.js';

/**
 * Controller for agent-specific endpoints.
 * Agents use these to view their assigned properties and landlord info.
 */
@ApiTags('agents')
@ApiBearerAuth()
@Controller('agents/me')
@Roles(Role.AGENT)
export class AgentsController {
  constructor(private readonly propertyAccessService: PropertyAccessService) {}

  /**
   * Get all properties assigned to the current agent.
   */
  @Get('properties')
  @ApiOperation({ summary: 'Get properties assigned to current agent' })
  @ApiOkResponse({ description: 'List of assigned properties' })
  async getMyProperties(@CurrentUser('id') agentId: string): Promise<Property[]> {
    return this.propertyAccessService.getAccessibleProperties(agentId);
  }

  /**
   * Get landlord info for a specific property the agent manages.
   */
  @Get('properties/:propertyId/landlord')
  @ApiOperation({ summary: 'Get landlord info for a managed property' })
  @ApiOkResponse({ description: 'Landlord information' })
  async getLandlordForProperty(
    @CurrentUser('id') agentId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<User> {
    return this.propertyAccessService.getLandlordForManagedProperty(agentId, propertyId);
  }
}
