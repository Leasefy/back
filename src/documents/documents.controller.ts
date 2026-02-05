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
import { DocumentsService } from './documents.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { User } from '@prisma/client';
import {
  UploadDocumentDto,
  DocumentResponseDto,
  SignedUrlResponseDto,
} from './dto/index.js';
import { DocumentType, Role } from '../common/enums/index.js';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('applications/:applicationId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(Role.TENANT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
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
          enum: Object.values(DocumentType),
          description: 'Type of document',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded',
    type: DocumentResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file or application not in draft',
  })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async upload(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.documentsService.upload(applicationId, user.id, dto.type, file);
  }

  @Get()
  @ApiOperation({ summary: 'List all documents for an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  async list(@Param('applicationId', ParseUUIDPipe) applicationId: string) {
    return this.documentsService.findByApplication(applicationId);
  }

  @Get(':documentId/url')
  @ApiOperation({ summary: 'Get signed URL for document access' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Signed URL',
    type: SignedUrlResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized to access' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getSignedUrl(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    return this.documentsService.getSignedUrl(
      applicationId,
      documentId,
      user.id,
    );
  }

  @Delete(':documentId')
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Delete a document from an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 400, description: 'Application not in draft' })
  @ApiResponse({ status: 403, description: 'Not application owner' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async delete(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    await this.documentsService.delete(applicationId, documentId, user.id);
    return { message: 'Document deleted successfully' };
  }
}
