import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { PropertyAccessModule } from '../property-access/property-access.module.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';

@Module({
  imports: [PrismaModule, PropertyAccessModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
