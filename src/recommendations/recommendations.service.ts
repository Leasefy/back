import { Injectable } from '@nestjs/common';
import type { Property } from '@prisma/client';
import { PropertiesService } from '../properties/properties.service.js';
import { UsersService } from '../users/users.service.js';
import { PropertyStatus } from '../common/enums/index.js';
import { RecommendationScorer } from './scorer/recommendation-scorer.js';
import type { MatchResult } from './scorer/match-result.interface.js';
import {
  GetRecommendationsDto,
  RecommendationSort,
  AcceptanceProbability,
} from './dto/index.js';

/**
 * Extended property with match data merged in.
 */
export interface PropertyWithMatch extends Property {
  matchScore: number;
  acceptanceProbability: 'alta' | 'media' | 'baja';
  matchFactors: MatchResult['matchFactors'];
  recommendation: string;
}

/**
 * Paginated response with metadata.
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * RecommendationsService
 *
 * Orchestrates property recommendations for tenants.
 * Fetches properties, scores them using RecommendationScorer,
 * filters by minimum match threshold (>=40), and paginates results.
 */
@Injectable()
export class RecommendationsService {
  private readonly MIN_MATCH_SCORE = 40;

  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly usersService: UsersService,
    private readonly scorer: RecommendationScorer,
  ) {}

  /**
   * Get personalized property recommendations for a tenant.
   *
   * @param userId - Tenant user ID
   * @param filters - Sort, probability filter, pagination
   * @returns Paginated list of properties with match data
   */
  async getRecommendations(
    userId: string,
    filters: GetRecommendationsDto,
  ): Promise<PaginatedResponse<PropertyWithMatch>> {
    // 1. Fetch tenant profile
    const tenant = await this.usersService.getTenantProfile(userId);

    // 2. Fetch all non-DRAFT properties (up to 1000)
    // findPublic already excludes DRAFT via buildPublicWhereClause
    const propertiesResponse = await this.propertiesService.findPublic({
      page: 1,
      limit: 1000,
    });

    // 3. Filter to AVAILABLE only (exclude PENDING and RENTED)
    const availableProperties = propertiesResponse.data.filter(
      (p) => p.status === PropertyStatus.AVAILABLE,
    );

    // 4. Score each property
    const scored = availableProperties.map((property) => {
      const match = this.scorer.score(property, tenant);
      return {
        ...property,
        matchScore: match.matchScore,
        acceptanceProbability: match.acceptanceProbability,
        matchFactors: match.matchFactors,
        recommendation: match.recommendation,
      };
    });

    // 5. Filter by minimum match score >= 40
    let filtered = scored.filter((p) => p.matchScore >= this.MIN_MATCH_SCORE);

    // 6. Filter by probability if specified
    if (filters.probability) {
      filtered = filtered.filter(
        (p) => p.acceptanceProbability === filters.probability,
      );
    }

    // 7. Sort by requested parameter
    const sorted = this.sortProperties(filtered, filters.sort);

    // 8. Paginate
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 9;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);

    // 9. Build metadata
    const total = sorted.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginated,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get the top recommendation (highest match score).
   *
   * @param userId - Tenant user ID
   * @returns Single best property or null if none available
   */
  async getTopRecommendation(
    userId: string,
  ): Promise<PropertyWithMatch | null> {
    const result = await this.getRecommendations(userId, {
      sort: RecommendationSort.MATCH,
      page: 1,
      limit: 1,
    });

    return result.data[0] ?? null;
  }

  /**
   * Get match score for a specific property.
   *
   * @param userId - Tenant user ID
   * @param propertyId - Property ID
   * @returns Match result with score and factors
   */
  async getPropertyMatchScore(
    userId: string,
    propertyId: string,
  ): Promise<MatchResult> {
    // Fetch tenant profile
    const tenant = await this.usersService.getTenantProfile(userId);

    // Fetch property by ID (throws if not found)
    const property = await this.propertiesService.findByIdOrThrow(propertyId);

    // Score and return
    return this.scorer.score(property, tenant);
  }

  /**
   * Sort properties by requested criteria.
   */
  private sortProperties(
    properties: PropertyWithMatch[],
    sort: RecommendationSort = RecommendationSort.MATCH,
  ): PropertyWithMatch[] {
    switch (sort) {
      case RecommendationSort.MATCH:
        // Descending by match score
        return properties.sort((a, b) => b.matchScore - a.matchScore);

      case RecommendationSort.PRICE_ASC:
        // Ascending by monthly rent
        return properties.sort((a, b) => a.monthlyRent - b.monthlyRent);

      case RecommendationSort.PRICE_DESC:
        // Descending by monthly rent
        return properties.sort((a, b) => b.monthlyRent - a.monthlyRent);

      case RecommendationSort.PROBABILITY:
        // Descending by probability level (alta=3, media=2, baja=1), then by matchScore
        return properties.sort((a, b) => {
          const probA = this.probabilityToNumber(a.acceptanceProbability);
          const probB = this.probabilityToNumber(b.acceptanceProbability);
          if (probA !== probB) {
            return probB - probA;
          }
          return b.matchScore - a.matchScore;
        });

      default:
        return properties;
    }
  }

  /**
   * Convert acceptance probability to numeric value for sorting.
   */
  private probabilityToNumber(probability: 'alta' | 'media' | 'baja'): number {
    switch (probability) {
      case AcceptanceProbability.ALTA:
        return 3;
      case AcceptanceProbability.MEDIA:
        return 2;
      case AcceptanceProbability.BAJA:
        return 1;
      default:
        return 0;
    }
  }
}
