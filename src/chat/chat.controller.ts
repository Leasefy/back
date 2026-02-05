import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { ApplicationConversation, ChatMessage } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';
import { SendMessageDto } from './dto/index.js';

/**
 * Controller for application chat.
 * All endpoints require authentication.
 * Access is verified in service (tenant, landlord, or agent with property access).
 */
@ApiTags('application-chat')
@ApiBearerAuth()
@Controller('applications/:applicationId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get conversation and messages for an application.
   */
  @Get()
  @ApiOperation({ summary: 'Get chat conversation and messages' })
  @ApiOkResponse({ description: 'Conversation with messages' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<ApplicationConversation & { messages: ChatMessage[] }> {
    return this.chatService.getConversationWithMessages(applicationId, userId);
  }

  /**
   * Send a message in the application chat.
   */
  @Post('messages')
  @ApiOperation({ summary: 'Send a chat message' })
  @ApiCreatedResponse({ description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: SendMessageDto,
  ): Promise<ChatMessage> {
    return this.chatService.sendMessage(applicationId, userId, dto.content);
  }

  /**
   * Mark all messages as read.
   */
  @Patch('read')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiOkResponse({ description: 'Messages marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ message: string }> {
    await this.chatService.markAsRead(applicationId, userId);
    return { message: 'Mensajes marcados como leidos' };
  }

  /**
   * Get unread message count.
   */
  @Get('unread')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiOkResponse({
    description: 'Unread count',
    schema: {
      type: 'object',
      properties: { count: { type: 'number' } },
    },
  })
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<{ count: number }> {
    const count = await this.chatService.getUnreadCount(applicationId, userId);
    return { count };
  }
}
