import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { PropertyAccessModule } from '../property-access/property-access.module.js';
import { ChatService } from './chat.service.js';
import { ChatController } from './chat.controller.js';
import { MessagesInboxController } from './messages-inbox.controller.js';

@Module({
  imports: [PrismaModule, PropertyAccessModule],
  controllers: [ChatController, MessagesInboxController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
