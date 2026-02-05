import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { PropertyAccessService } from './property-access.service.js';
import { PropertyAccessController } from './property-access.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyAccessController],
  providers: [PropertyAccessService],
  exports: [PropertyAccessService],
})
export class PropertyAccessModule {}
