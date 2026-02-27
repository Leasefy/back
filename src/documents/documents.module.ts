import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsUploadController } from './documents-upload.controller.js';
import { DocumentsService } from './documents.service.js';
import { ApplicationsModule } from '../applications/applications.module.js';

@Module({
  imports: [ApplicationsModule],
  controllers: [DocumentsController, DocumentsUploadController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
