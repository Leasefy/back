import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { LeaseDocumentsService } from './lease-documents.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { User } from '@prisma/client';
import { UploadLeaseDocumentDto } from './dto/index.js';
import { LeaseDocumentType } from '../common/enums/index.js';

/**
 * Controller for lease document operations.
 * Handles upload, listing, signed URL generation, and deletion of lease documents.
 *
 * Both tenant and landlord can upload and access documents.
 * Only the uploader can delete, within a 24-hour window.
 */
@ApiTags('Lease Documents')
@ApiBearerAuth()
@Controller('leases/:leaseId/documents')
export class LeaseDocumentsController {
  constructor(
    private readonly leaseDocumentsService: LeaseDocumentsService,
  ) {}

  /**
   * POST /leases/:leaseId/documents
   * Upload a document for a lease.
   * Both tenant and landlord can upload.
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, JPEG, PNG, WebP, max 10MB)',
        },
        type: {
          type: 'string',
          enum: Object.values(LeaseDocumentType),
          description: 'Type of document',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file type or size',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to access this lease',
  })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async upload(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadLeaseDocumentDto,
    @CurrentUser() user: User,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.leaseDocumentsService.upload(leaseId, user.id, dto.type, file);
  }

  /**
   * GET /leases/:leaseId/documents
   * List all documents for a lease.
   * Both tenant and landlord can list.
   */
  @Get()
  @ApiOperation({ summary: 'List all documents for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to access this lease',
  })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async list(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser() user: User,
  ) {
    return this.leaseDocumentsService.findByLease(leaseId, user.id);
  }

  /**
   * GET /leases/:leaseId/documents/:id/url
   * Get signed URL for document access.
   * Both tenant and landlord can access.
   */
  @Get(':id/url')
  @ApiOperation({ summary: 'Get signed URL for document access' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiParam({ name: 'id', description: 'Document ID (cuid)' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL with 1-hour expiry',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to access this lease',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getSignedUrl(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Param('id') documentId: string,
    @CurrentUser() user: User,
  ) {
    return this.leaseDocumentsService.getSignedUrl(leaseId, documentId, user.id);
  }

  /**
   * DELETE /leases/:leaseId/documents/:id
   * Delete a document from a lease.
   * Only the uploader can delete, within 24 hours of upload.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document from a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiParam({ name: 'id', description: 'Document ID (cuid)' })
  @ApiResponse({ status: 200, description: 'Document deleted successfully' })
  @ApiResponse({
    status: 400,
    description: 'Document can only be deleted within 24 hours',
  })
  @ApiResponse({
    status: 403,
    description: 'Only the uploader can delete this document',
  })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @Param('id') documentId: string,
    @CurrentUser() user: User,
  ) {
    await this.leaseDocumentsService.delete(leaseId, documentId, user.id);
    return { message: 'Document deleted successfully' };
  }
}
