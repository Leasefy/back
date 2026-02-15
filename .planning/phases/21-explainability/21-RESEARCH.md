# Phase 21: Explainability - Research

**Researched:** 2026-02-15
**Domain:** AI Explainability, NLP Text Generation, DTO Transformation
**Confidence:** HIGH

## Summary

Phase 21 enhances the existing scoring engine with **premium explainability features** available to PRO and BUSINESS tier subscribers. The scoring pipeline (Phases 5, 9, 20) already generates structured explainability data: drivers, flags, conditions, and subscores. This phase transforms that structured data into **human-readable Spanish narratives** and enhances driver quality.

**Current State:**
- Score aggregator produces: drivers (array of {text, positive}), flags (array of {code, severity, message}), conditions (array of {type, message, required})
- Controller already gates premium scoring by `hasPremiumScoring` flag (line 190-205 in scoring.controller.ts)
- All explainability data stored as JSON columns in `RiskScoreResult` table
- Messages currently generated inline by models (e.g., "Excelente: el arriendo representa menos del 25% de los ingresos")

**What Phase 21 Adds:**
1. **Enhanced Driver Explanations**: More conversational, context-aware explanations in Spanish (improving existing inline messages)
2. **AI-Generated Narrative**: Cohere Command R+ generates a 2-3 paragraph summary explaining the score, key factors, and recommendations
3. **Enhanced Response DTO**: New `ExplainabilityDto` with formatted drivers, narrative, subscores breakdown
4. **Subscription Gating**: Already implemented via `hasPremiumScoring` check

**Primary recommendation:** Build a specialized `ExplainabilityService` that transforms structured scoring data into narrative explanations using Cohere, with fallback to template-based generation. Use DTO transformation patterns for response formatting. Leverage existing subscription gating.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| cohere-ai | ^7.x | AI narrative generation | Already integrated in Phase 20, free tier available, supports Spanish, Command R+ optimized for multilingual |
| @nestjs/common | ^10.x | DTO transformation, interceptors | NestJS standard for response formatting and serialization |
| class-transformer | ^0.5.x | DTO serialization | Standard NestJS pattern for transforming data to DTOs |
| class-validator | ^0.14.x | DTO validation | Already used across project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| handlebars | ^4.x | Template-based fallback | If Cohere unavailable, generate explanations from templates |
| @nestjs/swagger | ^7.x | API documentation | Already used, document new DTOs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Cohere | OpenAI GPT-4 | Paid model (violates user preference for free tier), already have Cohere integrated |
| Cohere | Claude API | Paid model, redundant given Cohere already working |
| AI generation | Template-only | Cheaper but less natural, harder to maintain, less contextual |

**Installation:**
```bash
# Already installed from Phase 20
npm install cohere-ai
# Optionally for template fallback
npm install handlebars @types/handlebars
```

## Architecture Patterns

### Recommended Project Structure
```
src/scoring/
├── explainability/
│   ├── explainability.service.ts          # Core service: orchestrates narrative generation
│   ├── driver-formatter.service.ts        # Enhances driver messages with context
│   ├── narrative-generator.service.ts     # Cohere integration for narrative
│   ├── template-generator.service.ts      # Fallback template-based generation
│   └── dto/
│       ├── explainability-response.dto.ts # Enhanced response with narrative
│       ├── driver-explanation.dto.ts      # Formatted driver
│       └── score-breakdown.dto.ts         # Category subscores with explanations
├── scoring.controller.ts                   # MODIFY: Add new endpoint for explainability
└── scoring.service.ts                      # MODIFY: Call explainability service
```

### Pattern 1: Service Composition for Explainability
**What:** Separate concerns into specialized services (driver formatting, narrative generation, fallback templates)
**When to use:** When building complex features with multiple steps and fallback logic
**Example:**
```typescript
// explainability.service.ts
@Injectable()
export class ExplainabilityService {
  constructor(
    private readonly driverFormatter: DriverFormatterService,
    private readonly narrativeGenerator: NarrativeGeneratorService,
    private readonly templateGenerator: TemplateGeneratorService,
  ) {}

  async generateExplanation(
    result: RiskScoreResult,
    application: Application,
  ): Promise<ExplainabilityDto> {
    // 1. Format drivers with enhanced context
    const enhancedDrivers = this.driverFormatter.format(
      result.drivers as Driver[],
      result,
      application,
    );

    // 2. Generate AI narrative (with fallback)
    let narrative: string;
    try {
      narrative = await this.narrativeGenerator.generate(result, enhancedDrivers);
    } catch (error) {
      this.logger.warn('AI narrative failed, using template fallback');
      narrative = this.templateGenerator.generate(result, enhancedDrivers);
    }

    // 3. Build subscores breakdown
    const subscores = this.buildSubscoresBreakdown(result);

    return {
      totalScore: result.totalScore,
      level: result.level,
      narrative,
      drivers: enhancedDrivers,
      flags: result.flags as Flag[],
      conditions: result.conditions as Condition[],
      subscores,
    };
  }
}
```

### Pattern 2: Cohere Prompt Engineering for Financial Explainability
**What:** Structured prompts that provide scoring context and request narrative in specific format
**When to use:** When generating explanations from AI for financial/risk scoring
**Example:**
```typescript
// narrative-generator.service.ts
async generate(result: RiskScoreResult, drivers: DriverExplanationDto[]): Promise<string> {
  const systemPrompt = `Eres un asesor financiero experto explicando un puntaje de riesgo crediticio.

CONTEXTO:
- Puntaje total: ${result.totalScore}/100 (Nivel ${result.level})
- Factores clave: ${JSON.stringify(drivers)}
- Banderas de riesgo: ${JSON.stringify(result.flags)}
- Condiciones sugeridas: ${JSON.stringify(result.conditions)}

TAREA:
Genera una explicación narrativa en español de 2-3 párrafos que:
1. Resume el puntaje y nivel de riesgo de forma clara
2. Explica los 3-4 factores más importantes que influyeron en el puntaje
3. Menciona cualquier bandera de riesgo identificada
4. Concluye con recomendaciones o condiciones sugeridas

TONO: Profesional pero accesible, objetivo, no condescendiente.
FORMATO: Texto plano, párrafos separados por doble salto de línea.`;

  const response = await this.cohereService.analyze(systemPrompt, '');
  return response.content;
}
```

### Pattern 3: DTO Transformation with Class-Transformer
**What:** Use `@Expose()` and custom transformers to shape response data
**When to use:** When building API responses that need formatting/filtering
**Example:**
```typescript
// dto/explainability-response.dto.ts
import { Expose, Type } from 'class-transformer';

export class DriverExplanationDto {
  @Expose()
  text!: string;

  @Expose()
  positive!: boolean;

  @Expose()
  category!: 'financial' | 'stability' | 'history' | 'integrity';

  @Expose()
  icon!: string; // Frontend hint: 'trending_up' | 'trending_down' | 'warning'
}

export class ExplainabilityDto {
  @Expose()
  totalScore!: number;

  @Expose()
  level!: string;

  @Expose()
  narrative!: string; // AI-generated or template

  @Expose()
  @Type(() => DriverExplanationDto)
  drivers!: DriverExplanationDto[];

  @Expose()
  flags!: Flag[];

  @Expose()
  conditions!: Condition[];

  @Expose()
  subscores!: {
    financial: { score: number; maxScore: number; label: string };
    stability: { score: number; maxScore: number; label: string };
    history: { score: number; maxScore: number; label: string };
    integrity: { score: number; maxScore: number; label: string };
    paymentHistory?: { score: number; maxScore: number; label: string };
    documentVerification?: { score: number; maxScore: number; label: string };
  };
}
```

### Pattern 4: Template-Based Fallback Generation
**What:** Use Handlebars templates as fallback when AI unavailable
**When to use:** Ensure system works even if Cohere API fails or is unconfigured
**Example:**
```typescript
// template-generator.service.ts
generate(result: RiskScoreResult, drivers: DriverExplanationDto[]): string {
  const template = `El candidato ha obtenido un puntaje de {{totalScore}}/100, clasificado como nivel {{level}}.

{{#if isGoodScore}}
Este es un perfil sólido con {{positiveCount}} factores favorables.
{{else}}
El perfil presenta algunas áreas de preocupación con {{negativeCount}} factores de riesgo.
{{/if}}

Factores principales:
{{#each topDrivers}}
- {{this.text}}
{{/each}}

{{#if hasFlags}}
Se han identificado las siguientes banderas de riesgo: {{flagsList}}.
{{/if}}

{{#if hasConditions}}
Recomendaciones: {{conditionsList}}.
{{/if}}`;

  const compiled = Handlebars.compile(template);
  return compiled({
    totalScore: result.totalScore,
    level: this.getLevelLabel(result.level),
    isGoodScore: result.totalScore >= 65,
    positiveCount: drivers.filter(d => d.positive).length,
    negativeCount: drivers.filter(d => !d.positive).length,
    topDrivers: drivers.slice(0, 6),
    hasFlags: (result.flags as Flag[]).length > 0,
    flagsList: (result.flags as Flag[]).map(f => f.message).join(', '),
    hasConditions: (result.conditions as Condition[]).length > 0,
    conditionsList: (result.conditions as Condition[]).map(c => c.message).join('; '),
  });
}
```

### Anti-Patterns to Avoid
- **Generating AI explanations on every request:** Cache narratives in database after first generation to save API calls and latency
- **Exposing raw AI responses:** Always validate and sanitize AI-generated text before sending to client
- **Mixing business logic with formatting:** Keep driver enhancement separate from narrative generation
- **Ignoring AI failures:** Always have template fallback; never let AI failure break the endpoint

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template rendering | Custom string interpolation | Handlebars | Edge cases (escaping, loops, conditionals), well-tested |
| DTO serialization | Manual object mapping | class-transformer | Type safety, decorators, nested transformations |
| AI prompt caching | Custom cache layer | Redis or in-memory cache | Rate limiting, expiration, distributed cache support |
| Multilingual messages | Custom i18n system | nestjs-i18n (future) | Localization best practices, plural rules, fallbacks |

**Key insight:** Explainability is about presentation, not computation. Leverage existing scoring infrastructure and focus on transformation/formatting layers.

## Common Pitfalls

### Pitfall 1: Over-Reliance on AI Without Validation
**What goes wrong:** AI generates hallucinated or inappropriate explanations that don't match the actual score data
**Why it happens:** LLMs can be creative when given incomplete context or vague prompts
**How to avoid:**
- Always validate AI response against structured data (score, drivers, flags)
- Use structured prompts with explicit data context
- Implement sanity checks (e.g., narrative should mention the risk level)
- Have template fallback ready
**Warning signs:** Narratives mentioning factors not in the drivers list, incorrect score ranges, inconsistent tone

### Pitfall 2: Generating Explanations on Every View
**What goes wrong:** High latency, high Cohere API costs, poor UX
**Why it happens:** Treating explanation as ephemeral instead of persistent
**How to avoid:**
- Generate narrative once during scoring (async via BullMQ)
- Store narrative in `RiskScoreResult` table (add `narrative` TEXT column)
- Only regenerate if scoring algorithm version changes
- Use `algorithmVersion` field to detect stale explanations
**Warning signs:** Slow endpoint responses, high API bills, duplicate generations

### Pitfall 3: Poor Driver Categorization
**What goes wrong:** Drivers listed without context, hard for frontend to group/display effectively
**Why it happens:** Aggregator just collects signals without metadata
**How to avoid:**
- Add category field to drivers ('financial' | 'stability' | 'history' | 'integrity')
- Track which model generated each driver
- Provide frontend display hints (icon, color)
**Warning signs:** Frontend showing long unstructured list of drivers

### Pitfall 4: Ignoring Subscription Gating
**What goes wrong:** Free tier users see premium features, revenue loss
**Why it happens:** Forgetting to check `hasPremiumScoring` flag
**How to avoid:**
- Reuse existing `planEnforcement.canViewScoring()` check
- Return basic response for FREE tier (score + level only)
- Return explainability response for PRO/BUSINESS tier
- Document in API specs which fields are premium
**Warning signs:** All users seeing narratives, analytics showing no PRO conversions

### Pitfall 5: Spanish Grammar Issues in AI Generation
**What goes wrong:** AI generates grammatically correct but unnatural Spanish
**Why it happens:** Cohere trained primarily on English, Spanish is secondary
**How to avoid:**
- Use explicit language instruction in system prompt ("responde en español natural de Colombia")
- Provide example outputs in prompt
- Review AI outputs during development, adjust prompt accordingly
- Have template fallback in high-quality Spanish
**Warning signs:** User feedback about awkward phrasing, unnatural expressions

## Code Examples

Verified patterns from official sources and existing codebase:

### Example 1: Enhanced Endpoint in ScoringController
```typescript
// scoring.controller.ts
@Get(':applicationId/explanation')
@ApiOperation({
  summary: 'Get detailed score explanation (PRO/BUSINESS only)',
  description: 'Returns AI-generated narrative, enhanced drivers, and subscore breakdown'
})
@ApiResponse({ status: 200, type: ExplainabilityDto })
@ApiResponse({ status: 403, description: 'Plan does not include premium scoring' })
async getExplanation(
  @CurrentUser() user: User,
  @Param('applicationId', ParseUUIDPipe) applicationId: string,
): Promise<ExplainabilityDto> {
  // 1. Permission checks (same as getScore endpoint)
  const application = await this.prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { property: { select: { landlordId: true } } },
  });

  const isTenantOwner = application.tenantId === user.id;
  const isLandlord = application.property.landlordId === user.id;
  if (!isTenantOwner && !isLandlord) {
    throw new ForbiddenException('Not authorized to view this score');
  }

  // 2. Check premium scoring access
  const planConfig = await this.subscriptionsService.getUserPlanConfig(user.id);
  if (!planConfig.hasPremiumScoring) {
    throw new ForbiddenException({
      message: 'Tu plan no incluye explicaciones detalladas de scoring.',
      requiredPlan: 'PRO',
    });
  }

  // 3. Get score result
  const result = await this.scoringService.getScoreResult(applicationId);
  if (!result) {
    throw new NotFoundException('Score not found');
  }

  // 4. Generate or retrieve explanation
  return this.explainabilityService.generateExplanation(result, application);
}
```

### Example 2: Driver Formatter Service
```typescript
// driver-formatter.service.ts
@Injectable()
export class DriverFormatterService {
  /**
   * Enhance drivers with category metadata and frontend display hints.
   */
  format(
    drivers: Driver[],
    result: RiskScoreResult,
    application: Application,
  ): DriverExplanationDto[] {
    // Get signals with category context
    const signals = result.signals as Signal[];

    return drivers.map((driver, index) => {
      // Find matching signal to get category
      const matchingSignal = signals.find(s => s.message === driver.text);
      const category = this.inferCategory(matchingSignal?.code || '');

      return {
        text: driver.text,
        positive: driver.positive,
        category,
        icon: this.getIcon(driver.positive, category),
      };
    });
  }

  private inferCategory(signalCode: string): 'financial' | 'stability' | 'history' | 'integrity' {
    if (signalCode.includes('RTI') || signalCode.includes('DTI') || signalCode.includes('BUFFER')) {
      return 'financial';
    }
    if (signalCode.includes('EMPLOYMENT') || signalCode.includes('TENURE')) {
      return 'stability';
    }
    if (signalCode.includes('REFERENCE') || signalCode.includes('RENTAL_HISTORY')) {
      return 'history';
    }
    return 'integrity';
  }

  private getIcon(positive: boolean, category: string): string {
    if (positive) return 'trending_up';
    if (category === 'integrity') return 'warning';
    return 'trending_down';
  }
}
```

### Example 3: Async Narrative Generation During Scoring
```typescript
// scoring.processor.ts (modification)
async process(job: Job<ScoringJobData>): Promise<void> {
  // ... existing scoring logic ...

  // 6. Persist result to database
  const scoreResult = await this.prisma.riskScoreResult.create({
    data: {
      applicationId,
      totalScore: result.total,
      level: result.level,
      // ... existing fields ...
      narrative: null, // Will be filled by explainability job
    },
  });

  // 7. If user has premium scoring, queue narrative generation
  const planConfig = await this.subscriptionsService.getUserPlanConfig(
    application.tenantId,
  );

  if (planConfig.hasPremiumScoring) {
    await this.explainabilityQueue.add('generate-narrative', {
      riskScoreResultId: scoreResult.id,
      applicationId,
    });
  }

  // 8. Update application status
  await this.prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.UNDER_REVIEW },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static canned messages | AI-generated contextual narratives | 2024-2025 | More natural, personalized explanations |
| Client-side explanation logic | Server-side generation with caching | 2023-2024 | Consistent explanations, easier updates |
| Single explanation format | Multi-format (technical, narrative, visual) | 2025-2026 | Serves different user personas |
| English-only explainability | Multilingual from start | 2024+ | Localization built-in |

**Deprecated/outdated:**
- **LIME/SHAP for tabular data:** Overkill for rule-based scoring (our models are already interpretable)
- **GPT-3.5 for Spanish:** Command R+ has better Spanish support and lower cost
- **Manual driver curation:** Automated extraction from signals is now standard

## Open Questions

1. **Should narratives be regenerated when algorithm version changes?**
   - What we know: `algorithmVersion` field exists in RiskScoreResult
   - What's unclear: Should old scores keep old narratives or regenerate?
   - Recommendation: Add migration to regenerate narratives when version bumps (one-time job)

2. **How to handle partial AI failures (e.g., narrative generation fails but scoring succeeded)?**
   - What we know: Cohere can timeout or return errors
   - What's unclear: Should we retry, fallback immediately, or expose error to user?
   - Recommendation: Single retry, then fallback to template, log error for monitoring

3. **Should tenant see different explanation than landlord for same score?**
   - What we know: Both can access the same score endpoint
   - What's unclear: Different perspectives might need different framing
   - Recommendation: Start with single narrative, consider role-based narratives in future iteration if needed

4. **How to version-control prompts?**
   - What we know: Prompts are code strings
   - What's unclear: Best practice for tracking prompt changes and A/B testing
   - Recommendation: Store prompts in config files, version in git, consider feature flags for A/B testing

## Sources

### Primary (HIGH confidence)
- **Existing Codebase:**
  - `/src/scoring/aggregator/score-aggregator.ts` - Driver/flag/condition generation logic
  - `/src/scoring/scoring.controller.ts` - Subscription gating pattern (lines 184-223)
  - `/src/ai/services/cohere.service.ts` - Cohere integration already built
  - `/src/subscriptions/services/subscriptions.service.ts` - `hasPremiumScoring` flag
  - `/src/scoring/models/financial-model.ts` - Signal generation pattern
  - `/prisma/seed-plans.ts` - Plan pricing and feature flags

### Secondary (MEDIUM confidence)
- [Cohere Command R+ Documentation](https://docs.cohere.com/docs/command-r-plus) - Multilingual support, Spanish optimization
- [NestJS Serialization](https://docs.nestjs.com/techniques/serialization) - DTO transformation patterns
- [NestJS Localization Guide](https://phrase.com/blog/posts/nestjs-localization/) - i18n patterns for future
- [MDPI: Performance, Fairness, and Explainability in AI-Based Credit Scoring](https://www.mdpi.com/1911-8074/19/2/104) - Regulatory context for explainability
- [Springer: Financial Explainable AI Review](https://link.springer.com/article/10.1007/s10462-024-11077-7) - Industry best practices

### Tertiary (LOW confidence)
- [Alessa: Risk Scoring Software 2026](https://alessa.com/blog/top-10-risk-scoring-software-solutions-in-2026/) - Market trends
- [ArXiv: LLMs for Explainable AI](https://arxiv.org/html/2504.00125v1) - Narrative generation research

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Cohere already integrated, NestJS patterns proven
- Architecture: HIGH - Service composition + DTO transformation are standard NestJS patterns
- Pitfalls: HIGH - Based on existing scoring implementation and AI integration experience

**Research date:** 2026-02-15
**Valid until:** 2026-04-15 (60 days - Cohere API stable, NestJS patterns mature)

---

## Key Findings for Planner

1. **Explainability infrastructure exists:** Drivers, flags, conditions already generated and stored. Phase 21 is about **presentation and AI enhancement**, not scoring logic changes.

2. **Subscription gating already works:** Reuse `hasPremiumScoring` check from scoring.controller.ts (lines 184-223). No new gating logic needed.

3. **Cohere already integrated:** CohereService from Phase 20 is ready to use. Just need new prompts for narrative generation.

4. **3-service pattern recommended:**
   - `DriverFormatterService`: Add category metadata to drivers
   - `NarrativeGeneratorService`: Cohere prompt engineering
   - `ExplainabilityService`: Orchestration layer
   - `TemplateGeneratorService`: Fallback when AI unavailable

5. **Async generation via BullMQ:** Generate narratives during scoring (scoring.processor.ts), store in database. Don't generate on-demand unless necessary.

6. **Spanish quality matters:** Cohere Command R+ supports Spanish but needs explicit prompting. Template fallback ensures quality.

7. **DTO transformation over manual mapping:** Use class-transformer decorators for response shaping. Follows existing PaymentReputationDto pattern.

**Estimated complexity:** MEDIUM - New services but leveraging existing infrastructure. Main work is prompt engineering and DTO design.
