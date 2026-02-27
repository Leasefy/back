import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ApplicationConversation, ChatMessage } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { PropertyAccessService } from '../property-access/property-access.service.js';

/**
 * Service for application chat operations.
 * Uses Supabase Realtime for live message delivery (frontend subscribes to chat_messages table).
 * Backend writes to database, Supabase handles WebSocket broadcast.
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyAccessService: PropertyAccessService,
  ) {}

  /**
   * Get or create a conversation for an application.
   * Called when application is submitted.
   */
  async getOrCreateConversation(applicationId: string): Promise<ApplicationConversation> {
    // Check if conversation exists
    const existing = await this.prisma.applicationConversation.findUnique({
      where: { applicationId },
    });

    if (existing) {
      return existing;
    }

    // Create new conversation
    return this.prisma.applicationConversation.create({
      data: { applicationId },
    });
  }

  /**
   * Get conversation with messages.
   * Verifies user has access (tenant, landlord, or agent with property access).
   */
  async getConversationWithMessages(
    applicationId: string,
    userId: string,
  ): Promise<ApplicationConversation & { messages: ChatMessage[] }> {
    // First verify access
    await this.verifyAccess(applicationId, userId);

    const conversation = await this.prisma.applicationConversation.findUnique({
      where: { applicationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada para esta aplicacion');
    }

    return conversation;
  }

  /**
   * Send a message in a conversation.
   * Message is written to database; Supabase Realtime broadcasts to subscribers.
   */
  async sendMessage(
    applicationId: string,
    senderId: string,
    content: string,
  ): Promise<ChatMessage> {
    // Verify access
    await this.verifyAccess(applicationId, senderId);

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(applicationId);

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.applicationConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  /**
   * Mark messages as read by the user.
   * Marks all unread messages from OTHER users as read.
   */
  async markAsRead(applicationId: string, userId: string): Promise<void> {
    // Verify access
    await this.verifyAccess(applicationId, userId);

    const conversation = await this.prisma.applicationConversation.findUnique({
      where: { applicationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversacion no encontrada');
    }

    // Mark messages from other users as read
    await this.prisma.chatMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  /**
   * Get unread message count for a user in an application.
   */
  async getUnreadCount(applicationId: string, userId: string): Promise<number> {
    const conversation = await this.prisma.applicationConversation.findUnique({
      where: { applicationId },
    });

    if (!conversation) {
      return 0;
    }

    return this.prisma.chatMessage.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  /**
   * Get all conversations for a user (inbox view).
   * Returns conversations where user is tenant or landlord, ordered by last activity.
   */
  async getMyConversations(userId: string) {
    // Find all applications where user is tenant or property landlord
    const applications = await this.prisma.application.findMany({
      where: {
        OR: [
          { tenantId: userId },
          { property: { landlordId: userId } },
        ],
        conversation: { isNot: null },
      },
      include: {
        property: {
          select: { id: true, title: true, landlordId: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        },
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: { id: true, firstName: true, lastName: true, role: true },
                },
              },
            },
          },
        },
      },
    });

    // Also fetch landlord info for each property
    const propertyIds = [...new Set(applications.map(a => a.property.id))];
    const properties = await this.prisma.property.findMany({
      where: { id: { in: propertyIds } },
      select: {
        id: true,
        landlord: {
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        },
      },
    });
    const landlordByPropertyId = new Map(
      properties.map(p => [p.id, p.landlord]),
    );

    // Build conversations with unread counts
    const conversations = await Promise.all(
      applications
        .filter(a => a.conversation)
        .map(async (app) => {
          const conv = app.conversation!;
          const lastMessage = conv.messages[0] ?? null;
          const landlord = landlordByPropertyId.get(app.property.id)!;
          const isTenant = app.tenantId === userId;
          const otherParticipant = isTenant ? landlord : app.tenant;

          const unreadCount = await this.prisma.chatMessage.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              readAt: null,
            },
          });

          return {
            id: conv.id,
            applicationId: app.id,
            property: { id: app.property.id, title: app.property.title },
            otherParticipant,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  senderId: lastMessage.senderId,
                  createdAt: lastMessage.createdAt,
                  sender: lastMessage.sender,
                }
              : null,
            unreadCount,
            updatedAt: conv.updatedAt,
          };
        }),
    );

    // Sort by most recent activity
    conversations.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return conversations;
  }

  /**
   * Get total unread message count across all conversations for a user.
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    // Find all conversation IDs where user participates
    const applications = await this.prisma.application.findMany({
      where: {
        OR: [
          { tenantId: userId },
          { property: { landlordId: userId } },
        ],
        conversation: { isNot: null },
      },
      select: {
        conversation: { select: { id: true } },
      },
    });

    const conversationIds = applications
      .map(a => a.conversation?.id)
      .filter((id): id is string => !!id);

    if (conversationIds.length === 0) return 0;

    return this.prisma.chatMessage.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  /**
   * Delete conversation for an application.
   * Called when application is withdrawn or rejected.
   */
  async deleteConversation(applicationId: string): Promise<void> {
    // Cascade delete handles messages
    await this.prisma.applicationConversation.deleteMany({
      where: { applicationId },
    });
  }

  /**
   * Verify user has access to application chat.
   * User must be: tenant (applicant), landlord (property owner), or agent with property access.
   */
  private async verifyAccess(applicationId: string, userId: string): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { id: true, landlordId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Aplicacion no encontrada');
    }

    // Tenant (applicant) has access
    if (application.tenantId === userId) {
      return;
    }

    // Landlord has access
    if (application.property.landlordId === userId) {
      return;
    }

    // Check if user is agent with property access
    const hasPropertyAccess = await this.propertyAccessService.canAccessProperty(
      userId,
      application.property.id,
    );

    if (hasPropertyAccess) {
      return;
    }

    throw new ForbiddenException('No tienes acceso a esta conversacion');
  }
}
