import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ChatService } from './chat.service.js';

/**
 * Controller for the user's message inbox.
 * Lists all conversations and provides unread counts.
 */
@ApiTags('messages')
@ApiBearerAuth()
@Controller('messages')
export class MessagesInboxController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get all conversations for the authenticated user.
   */
  @Get('conversations')
  @ApiOperation({ summary: 'List all chat conversations for current user' })
  @ApiOkResponse({ description: 'List of conversations with last message and unread count' })
  async getConversations(@CurrentUser('id') userId: string) {
    const conversations = await this.chatService.getMyConversations(userId);
    return { conversations };
  }

  /**
   * Get total unread message count across all conversations.
   */
  @Get('unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  @ApiOkResponse({
    description: 'Total unread count',
    schema: {
      type: 'object',
      properties: { count: { type: 'number' } },
    },
  })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.chatService.getTotalUnreadCount(userId);
    return { count };
  }
}
