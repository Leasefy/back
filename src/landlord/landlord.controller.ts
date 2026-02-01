import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { LandlordService } from './landlord.service.js';
import { CurrentUser, Roles } from '../auth/decorators/index.js';
import { Role } from '../common/enums/index.js';
import { CandidateCardDto, CandidateDetailDto } from './dto/index.js';
import type { User } from '@prisma/client';

/**
 * LandlordController
 *
 * Endpoints for landlord candidate management.
 * All endpoints require LANDLORD or BOTH role.
 * All endpoints verify property ownership before access.
 */
@ApiTags('Landlord')
@ApiBearerAuth()
@Controller('landlord')
@Roles(Role.LANDLORD, Role.BOTH)
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  /**
   * Get all candidates for a property.
   * Returns applications in reviewable states, sorted by score.
   *
   * Requirements: LAND-01, LAND-02, LAND-03
   */
  @Get('properties/:propertyId/candidates')
  @ApiOperation({
    summary: 'Get candidates for a property',
    description: 'Returns all applications in reviewable states, sorted by risk score (highest first).',
  })
  @ApiParam({ name: 'propertyId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of candidates', type: [CandidateCardDto] })
  @ApiResponse({ status: 403, description: 'You do not own this property' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async getCandidates(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<CandidateCardDto[]> {
    return this.landlordService.getCandidates(propertyId, user.id);
  }

  /**
   * Get full candidate detail for review.
   * Includes score breakdown, documents list, timeline, and note.
   *
   * Requirements: LAND-04
   */
  @Get('applications/:applicationId')
  @ApiOperation({
    summary: 'Get candidate detail',
    description: 'Returns full candidate detail including score breakdown, documents, timeline, and private note.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Candidate detail', type: CandidateDetailDto })
  @ApiResponse({ status: 403, description: 'You do not have access to this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getCandidateDetail(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<CandidateDetailDto> {
    return this.landlordService.getCandidateDetail(applicationId, user.id);
  }

  /**
   * Get signed URL for a candidate's document.
   *
   * Requirements: LAND-10
   */
  @Get('applications/:applicationId/documents/:documentId/url')
  @ApiOperation({
    summary: 'Get document URL',
    description: 'Returns a signed URL (1 hour expiry) for accessing a candidate document.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'documentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Signed URL for document' })
  @ApiResponse({ status: 403, description: 'You do not have access to this document' })
  @ApiResponse({ status: 404, description: 'Application or document not found' })
  async getDocumentUrl(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.landlordService.getDocumentUrl(applicationId, documentId, user.id);
  }
}
