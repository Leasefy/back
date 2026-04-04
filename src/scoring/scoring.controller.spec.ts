import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ScoringController } from './scoring.controller.js';
import { ScoringService } from './scoring.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { PaymentHistoryService } from './services/payment-history.service.js';
import { PaymentHistoryModel } from './models/payment-history-model.js';
import { PlanEnforcementService } from '../subscriptions/services/plan-enforcement.service.js';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service.js';
import { ExplainabilityService } from './explainability/explainability.service.js';

/**
 * Unit tests for ScoringController access control (ACCS-01 / ACCS-02).
 *
 * Verifies that:
 * - Only the tenant who owns the application can view scoring directly.
 * - Landlords receive 403 with a message directing them to the evaluation endpoint.
 * - Unrelated users receive 403.
 */

const TENANT_ID = 'tenant-uuid-1';
const LANDLORD_ID = 'landlord-uuid-1';
const UNRELATED_ID = 'unrelated-uuid-1';
const APPLICATION_ID = 'app-uuid-1';

const mockApplication = {
  id: APPLICATION_ID,
  tenantId: TENANT_ID,
  propertyId: 'property-uuid-1',
  status: 'SUBMITTED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockScoreResult = {
  id: 'score-uuid-1',
  applicationId: APPLICATION_ID,
  totalScore: 75,
  level: 'MEDIUM',
  financialScore: 20,
  stabilityScore: 18,
  historyScore: 20,
  integrityScore: 17,
  drivers: [],
  flags: [],
  conditions: [],
  signals: [],
  algorithmVersion: '1.0',
  narrative: null,
  subscores: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlanConfig = {
  hasPremiumScoring: true,
  maxProperties: null,
  maxScoringViewsPerMonth: null,
};

const mockViewCheck = {
  allowed: true,
  canMicropay: false,
  remainingViews: 10,
  micropayPrice: null,
};

const mockExplanation = {
  narrative: 'Tenant has a solid financial profile.',
  drivers: [],
  flags: [],
  conditions: [],
  subscores: {},
};

function makeUser(id: string) {
  return { id } as any;
}

describe('ScoringController — access control (ACCS-01/ACCS-02)', () => {
  let controller: ScoringController;
  let prisma: PrismaService;
  let scoringService: ScoringService;
  let planEnforcement: PlanEnforcementService;
  let subscriptionsService: SubscriptionsService;
  let explainabilityService: ExplainabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScoringController],
      providers: [
        { provide: ScoringService, useValue: { getScoreResult: jest.fn() } },
        { provide: PrismaService, useValue: { application: { findUnique: jest.fn() } } },
        { provide: PaymentHistoryService, useValue: {} },
        { provide: PaymentHistoryModel, useValue: {} },
        { provide: PlanEnforcementService, useValue: { canViewScoring: jest.fn(), recordScoringView: jest.fn() } },
        { provide: SubscriptionsService, useValue: { getUserPlanConfig: jest.fn() } },
        { provide: ExplainabilityService, useValue: { getExplanation: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ScoringController>(ScoringController);
    prisma = module.get<PrismaService>(PrismaService);
    scoringService = module.get<ScoringService>(ScoringService);
    planEnforcement = module.get<PlanEnforcementService>(PlanEnforcementService);
    subscriptionsService = module.get<SubscriptionsService>(SubscriptionsService);
    explainabilityService = module.get<ExplainabilityService>(ExplainabilityService);
  });

  // ---------------------------------------------------------------------------
  // getScore() — GET /scoring/:applicationId
  // ---------------------------------------------------------------------------

  describe('getScore()', () => {
    it('allows the tenant who owns the application to view scoring', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(mockApplication as any);
      jest.spyOn(planEnforcement, 'canViewScoring').mockResolvedValue(mockViewCheck as any);
      jest.spyOn(planEnforcement, 'recordScoringView').mockResolvedValue(undefined);
      jest.spyOn(subscriptionsService, 'getUserPlanConfig').mockResolvedValue(mockPlanConfig as any);
      jest.spyOn(scoringService, 'getScoreResult').mockResolvedValue(mockScoreResult as any);

      const result = await controller.getScore(makeUser(TENANT_ID), APPLICATION_ID);

      expect(result).toBeDefined();
      expect(result.applicationId).toBe(APPLICATION_ID);
    });

    it('returns 403 for a landlord trying to access scoring directly', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(mockApplication as any);

      await expect(
        controller.getScore(makeUser(LANDLORD_ID), APPLICATION_ID),
      ).rejects.toThrow(ForbiddenException);

      try {
        await controller.getScore(makeUser(LANDLORD_ID), APPLICATION_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('evaluacion');
      }
    });

    it('returns 403 for a user unrelated to the application', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(mockApplication as any);

      await expect(
        controller.getScore(makeUser(UNRELATED_ID), APPLICATION_ID),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns 404 when the application does not exist', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(null);

      await expect(
        controller.getScore(makeUser(TENANT_ID), APPLICATION_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------------
  // getExplanation() — GET /scoring/:applicationId/explanation
  // ---------------------------------------------------------------------------

  describe('getExplanation()', () => {
    it('allows the tenant who owns the application to view the explanation', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(mockApplication as any);
      jest.spyOn(subscriptionsService, 'getUserPlanConfig').mockResolvedValue(mockPlanConfig as any);
      jest.spyOn(scoringService, 'getScoreResult').mockResolvedValue(mockScoreResult as any);
      jest.spyOn(explainabilityService, 'getExplanation').mockResolvedValue(mockExplanation as any);

      const result = await controller.getExplanation(makeUser(TENANT_ID), APPLICATION_ID);

      expect(result).toBeDefined();
      expect(result.narrative).toBe(mockExplanation.narrative);
    });

    it('returns 403 for a landlord trying to access the explanation directly', async () => {
      jest.spyOn(prisma.application, 'findUnique').mockResolvedValue(mockApplication as any);

      await expect(
        controller.getExplanation(makeUser(LANDLORD_ID), APPLICATION_ID),
      ).rejects.toThrow(ForbiddenException);

      try {
        await controller.getExplanation(makeUser(LANDLORD_ID), APPLICATION_ID);
      } catch (err) {
        expect(err).toBeInstanceOf(ForbiddenException);
        expect((err as ForbiddenException).message).toContain('inquilino');
      }
    });
  });
});
