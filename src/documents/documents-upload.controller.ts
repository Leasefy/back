import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Param,
  ParseUUIDPipe,
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
import { UploadDocumentDto, DocumentResponseDto } from './dto/index.js';
import { DocumentType, Role } from '../common/enums/index.js';

/**
 * Convenience controller at /documents/upload.
 * Frontend calls this route (without applicationId in URL).
 * Finds the user's latest DRAFT application automatically.
 */
@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsUploadController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @Roles(Role.TENANT)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a document to the tenant\'s latest application',
  })
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
  @ApiResponse({ status: 400, description: 'Invalid file or no draft application' })
  @ApiResponse({ status: 404, description: 'No active application found' })
  async uploadToLatest(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Find the user's latest DRAFT application
    const applicationId =
      await this.documentsService.findLatestDraftApplicationId(user.id);

    return this.documentsService.upload(applicationId, user.id, dto.type, file);
  }

  @Get('application/:applicationId')
  @ApiOperation({ summary: 'Get documents for an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID' })
  @ApiResponse({
    status: 200,
    description: 'List of documents',
    type: [DocumentResponseDto],
  })
  async getByApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.documentsService.findByApplication(applicationId);
  }
}
