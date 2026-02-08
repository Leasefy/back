import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ActivityType } from '../common/enums/index.js';
import { ActivityResponseDto, PaginatedActivitiesResponseDto } from './dto/index.js';
import { GetActivitiesDto } from './dto/index.js';

interface CreateActivityData {
  userId: string;
  actorId: string;
  type: ActivityType;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new activity log entry.
   * Called by event listeners to record significant user actions.
   */
  async create(data: CreateActivityData): Promise<void> {
    await this.prisma.activityLog.create({
      data: {
        userId: data.userId,
        actorId: data.actorId,
        type: data.type,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        metadata: data.metadata
          ? JSON.parse(JSON.stringify(data.metadata))
          : undefined,
      },
    });
  }

  /**
   * Get paginated activity feed for a user.
   * Supports cursor-based pagination and filtering by propertyId / activity types.
   */
  async getActivities(
    userId: string,
    dto: GetActivitiesDto,
  ): Promise<PaginatedActivitiesResponseDto> {
    const limit = dto.limit ?? 20;

    // Build where clause
    const where: Record<string, unknown> = { userId };

    if (dto.cursor) {
      where.createdAt = { lt: new Date(dto.cursor) };
    }

    if (dto.types && dto.types.length > 0) {
      where.type = { in: dto.types };
    }

    if (dto.propertyId) {
      where.metadata = {
        path: ['propertyId'],
        equals: dto.propertyId,
      };
    }

    // Query one extra to detect hasMore
    const activities = await this.prisma.activityLog.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, limit) : activities;

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].createdAt.toISOString()
        : null;

    return {
      items: items.map((activity) => this.formatActivity(activity)),
      nextCursor,
      hasMore,
    };
  }

  /**
   * Format a raw activity log entry into the response DTO shape.
   */
  private formatActivity(
    activity: {
      id: string;
      type: string;
      resourceType: string;
      resourceId: string;
      metadata: unknown;
      createdAt: Date;
      actor: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
      };
    },
  ): ActivityResponseDto {
    const { actor } = activity;
    const actorName =
      [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email;

    return {
      id: activity.id,
      type: activity.type as ActivityType,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      actorName,
      metadata: (activity.metadata as Record<string, unknown>) ?? {},
      createdAt: activity.createdAt,
    };
  }
}
