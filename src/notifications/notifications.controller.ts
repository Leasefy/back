import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Controller for user notification inbox.
 * Returns notifications from NotificationLog mapped to frontend format.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /notifications — list notifications for the authenticated user.
   */
  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiOkResponse({ description: 'Paginated notifications' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'read', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(parseInt(limit || '50', 10) || 50, 100);
    const skip = ((parseInt(page || '1', 10) || 1) - 1) * take;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notificationLog.count({ where: { userId } }),
    ]);

    const notifications = logs.map((log) => ({
      id: log.id,
      type: log.templateCode.toLowerCase(),
      category: this.categorizeTemplate(log.templateCode),
      title: log.subject || log.templateCode.replace(/_/g, ' '),
      message: `Notificacion enviada via ${log.channel.toLowerCase()}`,
      read: true, // NotificationLog doesn't track read state yet
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      notifications,
      total,
      unreadCount: 0,
    };
  }

  /**
   * PATCH /notifications/:id/read — mark notification as read (no-op for now).
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser('id') _userId: string,
    @Param('id', ParseUUIDPipe) _id: string,
  ) {
    return { success: true };
  }

  /**
   * POST /notifications/mark-all-read — mark all as read (no-op for now).
   */
  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') _userId: string) {
    return { success: true };
  }

  /**
   * DELETE /notifications/:id — delete a notification (no-op for now).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser('id') _userId: string,
    @Param('id', ParseUUIDPipe) _id: string,
  ): Promise<void> {
    // NotificationLog is an audit log, don't actually delete
  }

  private categorizeTemplate(templateCode: string): string {
    const code = templateCode.toUpperCase();
    if (code.includes('APPLICATION')) return 'application';
    if (code.includes('PAYMENT') || code.includes('RECEIPT')) return 'payment';
    if (code.includes('VISIT')) return 'visit';
    if (code.includes('CONTRACT')) return 'contract';
    if (code.includes('LEASE')) return 'lease';
    if (code.includes('PROPERTY')) return 'property';
    if (code.includes('DOCUMENT')) return 'document';
    return 'general';
  }
}
