import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
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
import {
  CandidateCardDto,
  CandidateDetailDto,
  PreapproveCandidateDto,
  ApproveCandidateDto,
  RejectCandidateDto,
  RequestInfoDto,
  CreateNoteDto,
} from './dto/index.js';
import type { User, Application, LandlordNote } from '@prisma/client';

/**
 * LandlordController
 *
 * Endpoints for landlord candidate management.
 * All endpoints require LANDLORD role (AGENT gets access via RolesGuard).
 * All endpoints verify property ownership before access.
 */
@ApiTags('Landlord')
@ApiBearerAuth()
@Controller('landlord')
@Roles(Role.LANDLORD)
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
    description:
      'Returns all applications in reviewable states, sorted by risk score (highest first).',
  })
  @ApiParam({ name: 'propertyId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'List of candidates',
    type: [CandidateCardDto],
  })
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
    description:
      'Returns full candidate detail including score breakdown, documents, timeline, and private note.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Candidate detail',
    type: CandidateDetailDto,
  })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
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
    description:
      'Returns a signed URL (1 hour expiry) for accessing a candidate document.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'documentId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Signed URL for document' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this document',
  })
  @ApiResponse({
    status: 404,
    description: 'Application or document not found',
  })
  async getDocumentUrl(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.landlordService.getDocumentUrl(
      applicationId,
      documentId,
      user.id,
    );
  }

  /**
   * Pre-approve a candidate.
   * Signals interest and moves to final steps.
   *
   * Requirements: LAND-05
   */
  @Post('applications/:applicationId/preapprove')
  @ApiOperation({
    summary: 'Pre-approve a candidate',
    description:
      'Signals interest in the candidate. Application moves to PREAPPROVED status.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Candidate pre-approved' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async preapprove(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: PreapproveCandidateDto,
  ): Promise<Application> {
    return this.landlordService.preapprove(applicationId, user.id, dto);
  }

  /**
   * Approve a candidate.
   * Final approval - tenant can proceed to contract.
   *
   * Requirements: LAND-06
   */
  @Post('applications/:applicationId/approve')
  @ApiOperation({
    summary: 'Approve a candidate',
    description:
      'Final approval. Tenant can proceed to contract. Application moves to APPROVED status.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Candidate approved' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async approve(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ApproveCandidateDto,
  ): Promise<Application> {
    return this.landlordService.approve(applicationId, user.id, dto);
  }

  /**
   * Reject a candidate.
   *
   * Requirements: LAND-07
   */
  @Post('applications/:applicationId/reject')
  @ApiOperation({
    summary: 'Reject a candidate',
    description:
      'Reject the application. Reason is required. Application moves to REJECTED status.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Candidate rejected' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async reject(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: RejectCandidateDto,
  ): Promise<Application> {
    return this.landlordService.reject(applicationId, user.id, dto);
  }

  /**
   * Request additional information from candidate.
   *
   * Requirements: LAND-08
   */
  @Post('applications/:applicationId/request-info')
  @ApiOperation({
    summary: 'Request additional info',
    description:
      'Request more information from the candidate. Application moves to NEEDS_INFO status.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Info requested' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async requestInfo(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: RequestInfoDto,
  ): Promise<Application> {
    return this.landlordService.requestInfo(applicationId, user.id, dto);
  }

  /**
   * Create or update a private note on a candidate.
   *
   * Requirements: LAND-09
   */
  @Post('applications/:applicationId/notes')
  @ApiOperation({
    summary: 'Create or update private note',
    description:
      'Creates a new note or updates existing. Notes are private and not visible to tenants.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Note saved' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async upsertNote(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: CreateNoteDto,
  ): Promise<LandlordNote> {
    return this.landlordService.upsertNote(applicationId, user.id, dto);
  }

  /**
   * Delete a private note from a candidate.
   *
   * Requirements: LAND-09
   */
  @Delete('applications/:applicationId/notes')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete private note',
    description: 'Removes the private note from the candidate.',
  })
  @ApiParam({ name: 'applicationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Note deleted' })
  @ApiResponse({
    status: 403,
    description: 'You do not have access to this application',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async deleteNote(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<void> {
    return this.landlordService.deleteNote(applicationId, user.id);
  }
}
