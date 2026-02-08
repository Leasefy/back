# Phase 19: Property Recommendations - Research

**Researched:** 2026-02-08
**Domain:** Personalized property matching and recommendation engine (NestJS 11 + Prisma 7)
**Confidence:** HIGH

## Summary

Phase 19 implements a server-side personalized recommendation engine that scores available properties against a tenant's profile and preferences, returning ranked property matches with explainability. This is a content-based filtering system that computes match scores (0-100) across four weighted factors: Affordability (40%), Risk Fit (30%), Profile Strength (15%), and Preferences (15%).

The implementation follows established patterns from Phase 5 (Scoring Engine) and Phase 14 (Wishlists). The scoring architecture already exists with `FeatureBuilder`, `ScoreAggregator`, and weighted model patterns. Phase 16 provides `TenantPreference` data (cities, bedrooms, types, budget, moveInDate). Phase 3 provides property filtering. The new recommendation engine combines these to produce match scores with factor breakdowns.

**Primary recommendation:** Create a `RecommendationsModule` following the established scoring pattern - build a `RecommendationScorer` that aggregates four sub-models (AffordabilityModel, RiskFitModel, ProfileStrengthModel, PreferencesModel), compute weighted scores, filter properties with >=40% match, and return paginated results with acceptance probability (alta/media/baja).

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x | Backend framework | Project's backend framework |
| Prisma | 7.x | ORM for database access | Project's data layer |
| class-validator | 0.14.3 | DTO validation | Project's validation library |
| @nestjs/swagger | Latest | API documentation | Project's API docs |

### Supporting (No New Dependencies Needed)
All functionality can be implemented with existing dependencies. The project already has:
- `PrismaService` for database queries (globally available via `@Global()` module)
- `UsersService.getTenantProfile()` for fetching tenant profile with preferences and risk score
- `PropertiesService.findPublic()` for fetching available properties
- Scoring patterns from Phase 5 (FeatureBuilder, ModelResult interface, weighted aggregation)

### Installation
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/recommendations/
  recommendations.module.ts
  recommendations.controller.ts      # GET endpoints for recommendations
  recommendations.service.ts         # Orchestrates scoring across properties
  scorer/
    recommendation-scorer.ts         # Main scorer - aggregates 4 models
    models/
      affordability.model.ts         # 40% weight - budget fit
      risk-fit.model.ts              # 30% weight - tenant risk vs property requirements
      profile-strength.model.ts      # 15% weight - application completeness
      preferences.model.ts           # 15% weight - city/bedroom/type/amenity match
    match-result.interface.ts        # Match score data structure
  dto/
    recommendation-response.dto.ts   # Response shape with match factors
    index.ts
```

### Pattern 1: Content-Based Recommendation Scoring
**What:** Compute per-property match scores by comparing property attributes against tenant profile/preferences using weighted sub-models.

**When to use:** When recommendation quality depends on explicit tenant preferences and profile data (not collaborative filtering based on similar users).

**Example:**
```typescript
// Derived from existing scoring patterns in src/scoring/
interface MatchResult {
  propertyId: string;
  matchScore: number;              // 0-100 total
  acceptanceProbability: 'alta' | 'media' | 'baja';
  matchFactors: {
    affordability: { score: number; label: string };    // 40%
    riskFit: { score: number; label: string };          // 30%
    profileStrength: { score: number; label: string };  // 15%
    preferences: { score: number; label: string };      // 15%
  };
  recommendation: string; // Spanish explanation
}

class RecommendationScorer {
  score(property: Property, tenant: TenantProfile): MatchResult {
    const affordability = this.affordabilityModel.score(property, tenant);
    const riskFit = this.riskFitModel.score(property, tenant);
    const profileStrength = this.profileStrengthModel.score(property, tenant);
    const preferences = this.preferencesModel.score(property, tenant);

    const matchScore = Math.round(
      affordability.score * 0.40 +
      riskFit.score * 0.30 +
      profileStrength.score * 0.15 +
      preferences.score * 0.15
    );

    const acceptanceProbability =
      matchScore >= 70 ? 'alta' :
      matchScore >= 50 ? 'media' : 'baja';

    return {
      propertyId: property.id,
      matchScore,
      acceptanceProbability,
      matchFactors: {
        affordability: { score: affordability.score, label: affordability.label },
        riskFit: { score: riskFit.score, label: riskFit.label },
        profileStrength: { score: profileStrength.score, label: profileStrength.label },
        preferences: { score: preferences.score, label: preferences.label },
      },
      recommendation: this.generateRecommendation(matchScore, matchFactors),
    };
  }
}
```

### Pattern 2: Reusable Scoring Models
**What:** Each factor (affordability, risk fit, etc.) is a separate model class that returns a `ModelResult` with score and label.

**When to use:** When scoring logic needs to be testable, modular, and reusable (same pattern as Phase 5).

**Example:**
```typescript
// Follow Phase 5 pattern from src/scoring/models/financial-model.ts
interface SubModelResult {
  score: number;  // 0-100 for this factor
  label: string;  // "Excelente ajuste" | "Buen ajuste" | "Ajuste aceptable" | "Fuera de presupuesto"
}

class AffordabilityModel {
  score(property: Property, tenant: TenantProfile): SubModelResult {
    const monthlyRent = property.monthlyRent + property.adminFee;
    const income = tenant.applicationData?.income ?? 0;

    if (income === 0) {
      return { score: 50, label: 'Sin información de ingresos' };
    }

    const rentToIncomeRatio = monthlyRent / income;

    // Perfect fit: RTI <= 0.30 (100 points)
    if (rentToIncomeRatio <= 0.30) {
      return { score: 100, label: 'Excelente ajuste de presupuesto' };
    }
    // Good fit: RTI 0.30-0.35 (80 points)
    if (rentToIncomeRatio <= 0.35) {
      return { score: 80, label: 'Buen ajuste de presupuesto' };
    }
    // Acceptable: RTI 0.35-0.40 (60 points)
    if (rentToIncomeRatio <= 0.40) {
      return { score: 60, label: 'Ajuste aceptable' };
    }
    // Outside budget: RTI > 0.40 (20-40 points depending on how far)
    const overBudgetScore = Math.max(20, 60 - (rentToIncomeRatio - 0.40) * 100);
    return { score: Math.round(overBudgetScore), label: 'Fuera de presupuesto ideal' };
  }
}
```

### Pattern 3: Paginated Recommendation Endpoint
**What:** Filter properties by >=40% match score, sort by match/price/probability, paginate results.

**When to use:** When returning large result sets that need client-side filtering/sorting.

**Example:**
```typescript
// Follow existing pagination pattern from src/properties/dto/paginated-response.dto.ts
@Get()
@ApiBearerAuth()
@Roles(Role.TENANT)
async getRecommendations(
  @CurrentUser('id') userId: string,
  @Query() query: GetRecommendationsDto,
) {
  const { sort = 'match', probability, page = 1, limit = 9 } = query;

  // Get tenant profile
  const tenant = await this.usersService.getTenantProfile(userId);

  // Get available properties (exclude drafts)
  const properties = await this.propertiesService.findPublic({ status: 'AVAILABLE' });

  // Score each property
  const scored = properties.map(prop => ({
    ...prop,
    match: this.scorer.score(prop, tenant),
  }));

  // Filter by minimum match score (40%)
  const filtered = scored.filter(p => p.match.matchScore >= 40);

  // Filter by acceptance probability if specified
  const probabilityFiltered = probability
    ? filtered.filter(p => p.match.acceptanceProbability === probability)
    : filtered;

  // Sort
  const sorted = this.sortRecommendations(probabilityFiltered, sort);

  // Paginate
  const paginated = this.paginate(sorted, page, limit);

  return {
    data: paginated.data.map(p => ({
      ...p,
      matchScore: p.match.matchScore,
      acceptanceProbability: p.match.acceptanceProbability,
      matchFactors: p.match.matchFactors,
      recommendation: p.match.recommendation,
    })),
    meta: paginated.meta,
  };
}
```

### Anti-Patterns to Avoid
- **Computing recommendations on every request without caching:** For large property catalogs, computing scores for every property on every request is expensive. Consider caching tenant profile data for the request duration.
- **Storing computed recommendations in database:** Match scores change as preferences/properties change. Don't store scores - compute them on-the-fly or cache for short durations.
- **Exposing internal scoring formulas to frontend:** Return scores and labels, not the raw calculation logic. Frontend should be agnostic to scoring internals.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted score aggregation | Custom weighted average calculator | Follow Phase 5 `ScoreAggregator` pattern | Already proven, tested, and understood in codebase |
| Tenant profile fetching | New query logic | `UsersService.getTenantProfile()` | Already aggregates User + TenantPreference + Application + RiskScore |
| Property filtering | New property queries | `PropertiesService.findPublic()` | Already excludes DRAFT, includes images, handles filters |
| Pagination logic | Custom offset/limit | Existing `PaginatedPropertiesResponse` pattern | Already used in properties module |
| Spanish labels | Hardcoded strings in logic | Labels computed in models with Spanish messages | Keeps logic separate from presentation |

**Key insight:** The recommendation engine is primarily a **composition** of existing services (UsersService, PropertiesService) plus new scoring models following Phase 5 patterns. Don't reinvent data access or scoring infrastructure.

## Common Pitfalls

### Pitfall 1: N+1 Query Problem When Scoring Multiple Properties
**What goes wrong:** Fetching tenant profile or property details inside the loop for each property causes N database queries.
**Why it happens:** Not pre-fetching all necessary data before scoring loop.
**How to avoid:**
1. Fetch tenant profile once at the start: `const tenant = await this.usersService.getTenantProfile(userId);`
2. Fetch all properties with includes once: `const properties = await this.propertiesService.findPublic({ status: 'AVAILABLE' });`
3. Score in-memory: `properties.map(prop => this.scorer.score(prop, tenant))`
**Warning signs:** Slow API responses, database query logs showing repeated similar queries.

### Pitfall 2: Missing Null Checks for Optional Tenant Data
**What goes wrong:** `Cannot read property 'income' of null` errors when tenant hasn't completed application or preferences.
**Why it happens:** TenantProfile has optional fields (`applicationData`, `preferences`, `riskData` can be null).
**How to avoid:**
- Use null coalescing: `const income = tenant.applicationData?.income ?? 0;`
- Provide default scores when data missing: If no preferences, preferences model returns 50/100
- Document behavior: Missing data = neutral/default scoring, not error
**Warning signs:** 500 errors for new tenants without applications, inconsistent scores.

### Pitfall 3: Forgetting to Filter by Minimum Match Score (40%)
**What goes wrong:** Low-quality recommendations (0-39% match) are returned, wasting tenant attention.
**Why it happens:** Forgetting the frontend's >=40% filter requirement.
**How to avoid:**
- Filter after scoring: `scored.filter(p => p.match.matchScore >= 40)`
- Document in code comments: "Frontend spec requires >=40% match"
- Add validation test: Ensure GET response never includes <40% matches
**Warning signs:** Frontend receives properties they shouldn't, confusion about filtering logic.

### Pitfall 4: Incorrect Acceptance Probability Thresholds
**What goes wrong:** Probability calculation doesn't match frontend spec (alta >=70%, media 50-69%, baja <50%).
**Why it happens:** Misreading spec or copy-paste error.
**How to avoid:**
- Extract to constant: `const PROBABILITY_THRESHOLDS = { ALTA: 70, MEDIA: 50 };`
- Add unit test: Verify threshold boundary cases (49 -> baja, 50 -> media, 69 -> media, 70 -> alta)
**Warning signs:** Frontend probability filters don't work correctly, mismatched UI labels.

### Pitfall 5: Not Handling Empty Result Sets
**What goes wrong:** API returns `{ data: [], meta: {...} }` but frontend expects at least one recommendation or special empty state.
**Why it happens:** All properties filtered out by >=40% match or probability filter.
**How to avoid:**
- Return consistent shape: Always return `{ data: [], meta }` for empty results
- Document behavior: Empty array is valid (tenant has no matches)
- Frontend handles gracefully: Show "No recommendations yet" UI
**Warning signs:** Frontend crashes on empty array, unclear UX for no matches.

## Code Examples

### Complete Affordability Model
```typescript
// Derived from Phase 5 scoring patterns (financial-model.ts)
import { Injectable } from '@nestjs/common';
import { Property } from '@prisma/client';
import { TenantProfile } from '../../users/users.service.js';

export interface SubModelResult {
  score: number;
  label: string;
}

@Injectable()
export class AffordabilityModel {
  /**
   * Score property affordability against tenant income.
   * 40% weight in overall match score.
   *
   * Logic:
   * - RTI <= 0.30: 100 points (Excelente)
   * - RTI 0.30-0.35: 80 points (Buen ajuste)
   * - RTI 0.35-0.40: 60 points (Aceptable)
   * - RTI > 0.40: 20-40 points (Fuera de presupuesto)
   */
  score(property: Property, tenant: TenantProfile): SubModelResult {
    const monthlyRent = property.monthlyRent + property.adminFee;
    const income = tenant.applicationData?.income ?? 0;

    // No income data = neutral score
    if (income === 0) {
      return { score: 50, label: 'Sin información de ingresos' };
    }

    const rentToIncomeRatio = monthlyRent / income;

    if (rentToIncomeRatio <= 0.30) {
      return { score: 100, label: 'Excelente ajuste de presupuesto' };
    }
    if (rentToIncomeRatio <= 0.35) {
      return { score: 80, label: 'Buen ajuste de presupuesto' };
    }
    if (rentToIncomeRatio <= 0.40) {
      return { score: 60, label: 'Ajuste aceptable' };
    }

    // Over budget: score decreases as ratio increases
    const overBudgetPenalty = (rentToIncomeRatio - 0.40) * 100;
    const score = Math.max(20, 60 - overBudgetPenalty);
    return { score: Math.round(score), label: 'Fuera de presupuesto ideal' };
  }
}
```

### Complete Risk Fit Model
```typescript
// Derived from Phase 5 risk level logic
import { Injectable } from '@nestjs/common';
import { Property, RiskLevel } from '@prisma/client';
import { TenantProfile } from '../../users/users.service.js';

@Injectable()
export class RiskFitModel {
  /**
   * Score tenant risk level fit for property requirements.
   * 30% weight in overall match score.
   *
   * Logic:
   * - Risk level A: 100 points (any property)
   * - Risk level B: 85 points (most properties)
   * - Risk level C: 60 points (may need higher deposit)
   * - Risk level D: 30 points (needs cosigner)
   * - No risk score: 50 points (neutral)
   */
  score(property: Property, tenant: TenantProfile): SubModelResult {
    const riskLevel = tenant.riskData?.level;

    if (!riskLevel) {
      return { score: 50, label: 'Sin evaluación de riesgo' };
    }

    switch (riskLevel) {
      case RiskLevel.A:
        return { score: 100, label: 'Perfil excelente para esta propiedad' };
      case RiskLevel.B:
        return { score: 85, label: 'Buen perfil para esta propiedad' };
      case RiskLevel.C:
        return { score: 60, label: 'Perfil aceptable, puede requerir depósito adicional' };
      case RiskLevel.D:
        return { score: 30, label: 'Perfil de riesgo alto, puede requerir codeudor' };
      default:
        return { score: 50, label: 'Sin evaluación de riesgo' };
    }
  }
}
```

### Complete Preferences Model
```typescript
// New model for matching tenant preferences against property attributes
import { Injectable } from '@nestjs/common';
import { Property } from '@prisma/client';
import { TenantProfile } from '../../users/users.service.js';

@Injectable()
export class PreferencesModel {
  /**
   * Score property match against tenant preferences.
   * 15% weight in overall match score.
   *
   * Logic:
   * - City match: +30 points (or 0)
   * - Bedroom match: +25 points (or 0)
   * - Property type match: +25 points (or 0)
   * - Budget match (minBudget <= rent <= maxBudget): +20 points (or 0)
   * Total: 0-100 based on criteria met
   */
  score(property: Property, tenant: TenantProfile): SubModelResult {
    const prefs = tenant.preferences;

    // No preferences = neutral
    if (!prefs) {
      return { score: 50, label: 'Sin preferencias configuradas' };
    }

    let points = 0;
    const matches: string[] = [];

    // City match (30 points)
    if (prefs.preferredCities && prefs.preferredCities.length > 0) {
      if (prefs.preferredCities.includes(property.city)) {
        points += 30;
        matches.push('ciudad');
      }
    }

    // Bedroom match (25 points)
    if (prefs.preferredBedrooms !== null) {
      if (property.bedrooms === prefs.preferredBedrooms) {
        points += 25;
        matches.push('habitaciones');
      }
    }

    // Property type match (25 points)
    if (prefs.preferredPropertyTypes && prefs.preferredPropertyTypes.length > 0) {
      if (prefs.preferredPropertyTypes.includes(property.type)) {
        points += 25;
        matches.push('tipo');
      }
    }

    // Budget match (20 points)
    if (prefs.minBudget !== null || prefs.maxBudget !== null) {
      const minOk = prefs.minBudget === null || property.monthlyRent >= prefs.minBudget;
      const maxOk = prefs.maxBudget === null || property.monthlyRent <= prefs.maxBudget;
      if (minOk && maxOk) {
        points += 20;
        matches.push('presupuesto');
      }
    }

    const label = matches.length > 0
      ? `Coincide con tus preferencias: ${matches.join(', ')}`
      : 'No coincide con tus preferencias';

    return { score: points, label };
  }
}
```

### Complete Recommendation Service
```typescript
// src/recommendations/recommendations.service.ts
import { Injectable } from '@nestjs/common';
import { PropertiesService } from '../properties/properties.service.js';
import { UsersService } from '../users/users.service.js';
import { RecommendationScorer } from './scorer/recommendation-scorer.js';
import { PropertyStatus } from '../common/enums/index.js';

@Injectable()
export class RecommendationsService {
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
   * @returns Paginated recommendations with match scores
   */
  async getRecommendations(
    userId: string,
    filters: {
      sort?: 'match' | 'price_asc' | 'price_desc' | 'probability';
      probability?: 'alta' | 'media' | 'baja';
      page?: number;
      limit?: number;
    },
  ) {
    const { sort = 'match', probability, page = 1, limit = 9 } = filters;

    // Fetch tenant profile once
    const tenant = await this.usersService.getTenantProfile(userId);

    // Fetch all available properties once
    const propertiesResponse = await this.propertiesService.findPublic({
      status: PropertyStatus.AVAILABLE,
      page: 1,
      limit: 1000, // Get all for scoring
    });

    // Score each property in-memory
    const scored = propertiesResponse.data.map((property) => {
      const match = this.scorer.score(property, tenant);
      return {
        property,
        match,
      };
    });

    // Filter by minimum match score (40%)
    let filtered = scored.filter((item) => item.match.matchScore >= 40);

    // Filter by acceptance probability if specified
    if (probability) {
      filtered = filtered.filter(
        (item) => item.match.acceptanceProbability === probability,
      );
    }

    // Sort
    const sorted = this.sortRecommendations(filtered, sort);

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);

    const totalPages = Math.ceil(sorted.length / limit);

    return {
      data: paginated.map((item) => ({
        ...item.property,
        matchScore: item.match.matchScore,
        acceptanceProbability: item.match.acceptanceProbability,
        matchFactors: item.match.matchFactors,
        recommendation: item.match.recommendation,
      })),
      meta: {
        total: sorted.length,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get the single best recommendation for a tenant.
   */
  async getTopRecommendation(userId: string) {
    const result = await this.getRecommendations(userId, {
      sort: 'match',
      page: 1,
      limit: 1,
    });

    return result.data[0] ?? null;
  }

  /**
   * Get match score for a specific property.
   */
  async getPropertyMatchScore(userId: string, propertyId: string) {
    const tenant = await this.usersService.getTenantProfile(userId);
    const property = await this.propertiesService.findByIdOrThrow(propertyId);

    return this.scorer.score(property, tenant);
  }

  /**
   * Sort recommendations based on sort parameter.
   */
  private sortRecommendations(
    items: Array<{ property: any; match: any }>,
    sort: string,
  ) {
    switch (sort) {
      case 'match':
        return items.sort((a, b) => b.match.matchScore - a.match.matchScore);
      case 'price_asc':
        return items.sort(
          (a, b) => a.property.monthlyRent - b.property.monthlyRent,
        );
      case 'price_desc':
        return items.sort(
          (a, b) => b.property.monthlyRent - a.property.monthlyRent,
        );
      case 'probability':
        // Sort by probability level (alta > media > baja), then by match score
        const probOrder = { alta: 3, media: 2, baja: 1 };
        return items.sort((a, b) => {
          const probDiff =
            probOrder[b.match.acceptanceProbability] -
            probOrder[a.match.acceptanceProbability];
          return probDiff !== 0
            ? probDiff
            : b.match.matchScore - a.match.matchScore;
        });
      default:
        return items;
    }
  }
}
```

## State of the Art

### Recommendation System Approaches (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Collaborative filtering only | Hybrid content-based + collaborative | 2024-2025 | Better cold-start performance for new users |
| Static rule-based scoring | ML-based adaptive scoring | 2025 | More accurate predictions, personalized weights |
| Client-side filtering | Server-side scoring + filtering | Always preferred | Consistent scoring, better performance |
| Real-time scoring | Cached/precomputed recommendations | 2025 for large catalogs | Faster response times at scale |

### Current Best Practices (2026)
Based on web research findings:

1. **Content-Based Filtering for Cold Start:** When users lack interaction history, content-based filtering (matching user preferences to item attributes) outperforms collaborative filtering. This matches Phase 19's approach perfectly.

2. **Weighted Factor Models:** Modern recommendation systems use weighted multi-factor scoring (40% affordability, 30% risk fit, etc.) rather than single-metric ranking. Neural and graph-based models achieve 15% better ranking on large datasets, but simpler weighted models remain effective for small-medium catalogs (<10,000 properties).

3. **Explainability Required:** Users expect to understand WHY a property was recommended. The match factors breakdown ("40% affordability score: Excelente ajuste") provides this transparency.

4. **Hybrid Approaches Win:** The most powerful systems combine content-based + collaborative filtering. Phase 19 starts with content-based (immediate value), with room to add collaborative signals later (Phase 22: ML persistence could track user interactions).

**For Leasify's scale (~100s of properties):** Content-based filtering with weighted models is optimal. No need for complex neural networks or graph algorithms yet.

## Open Questions

1. **Should match scores be cached?**
   - What we know: Scores change when preferences or properties update. Tenant preferences update infrequently, properties change daily (new listings, status changes).
   - What's unclear: Performance impact of scoring 100+ properties on every request vs. cache complexity.
   - Recommendation: Start without caching (compute on-the-fly). Profile performance. Add caching only if response times exceed 500ms. Cache key: `tenant-{userId}-recommendations` with 5-minute TTL.

2. **Should properties without images be excluded?**
   - What we know: Properties can have 0-10 images. Frontend expects images for display.
   - What's unclear: Whether to filter out properties with no images or include them with placeholder.
   - Recommendation: Include all properties regardless of images. Frontend already handles missing images with placeholders. Filtering by images would hide valid properties.

3. **Should acceptance probability calculation consider property-specific requirements?**
   - What we know: Current spec uses only match score (>=70% = alta, 50-69% = media, <50% = baja).
   - What's unclear: Should we adjust probability based on property-specific factors (e.g., landlord-set minimum income requirement)?
   - Recommendation: Start with match-score-only calculation per spec. In Phase 19.1 (future), add property-specific requirement checks that override probability (e.g., "baja" if tenant income < property's minIncomeRequirement).

4. **Should the recommendation engine filter by tenant move-in date?**
   - What we know: TenantPreference has optional `moveInDate`. Properties don't currently have "availableFrom" date.
   - What's unclear: Whether to use moveInDate for filtering or just as a signal in scoring.
   - Recommendation: Ignore moveInDate for now (properties assumed available immediately). If property availability dates are added later, use moveInDate as a hard filter (exclude properties available after tenant's desired date).

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct examination of relevant source files:
  - `prisma/schema.prisma` - TenantPreference model (lines 1118-1133), Property model (lines 346-400), RiskScoreResult model (lines 547-579)
  - `src/users/users.service.ts` - getTenantProfile() method (lines 176-240) aggregates User + TenantPreference + Application + RiskScore
  - `src/properties/properties.service.ts` - findPublic() with filtering (lines 213-255)
  - `src/scoring/scoring.service.ts` - Existing scoring patterns
  - `src/scoring/aggregator/score-aggregator.ts` - Weighted score aggregation pattern (lines 38-112)
  - `src/scoring/features/feature-builder.ts` - Feature extraction pattern (lines 20-79)

### Secondary (MEDIUM confidence)
- [Recommendation Systems: Applications and Examples 2026](https://research.aimultiple.com/recommendation-system/) - Overview of modern recommendation approaches
- [Adapting the Facebook Reels RecSys AI Model Based on User Feedback](https://engineering.fb.com/2026/01/14/ml-applications/adapting-the-facebook-reels-recsys-ai-model-based-on-user-feedback/) - Interest matching beyond topics
- [Collaborative Filtering: Your Guide to Smarter Recommendations](https://www.datacamp.com/tutorial/collaborative-filtering) - Content-based vs collaborative filtering
- [Collaborative filtering models: experimental and detailed comparative study](https://www.nature.com/articles/s41598-025-15096-4) - Neural/graph models achieve 15% improvement on large datasets
- [What Is NestJS? A Practical 2026 Guide](https://thelinuxcode.com/what-is-nestjs-a-practical-2026-guide-to-building-scalable-nodejs-backends/) - NestJS patterns in 2026

### Tertiary (LOW confidence)
- General web search results on recommendation algorithms - Used for understanding common patterns, not for specific implementation guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies already installed, no new packages needed
- Architecture: HIGH - Direct patterns from Phase 5 (scoring) and Phase 14 (module structure)
- Pitfalls: HIGH - Identified from actual codebase patterns (null handling, N+1 queries, filtering)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable patterns, no external API dependencies)
