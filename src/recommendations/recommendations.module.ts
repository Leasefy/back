import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { PropertiesModule } from '../properties/properties.module.js';
import { RecommendationsController } from './recommendations.controller.js';
import { RecommendationsService } from './recommendations.service.js';
import { RecommendationScorer } from './scorer/recommendation-scorer.js';
import { AffordabilityModel } from './scorer/models/affordability.model.js';
import { RiskFitModel } from './scorer/models/risk-fit.model.js';
import { ProfileStrengthModel } from './scorer/models/profile-strength.model.js';
import { PreferencesModel } from './scorer/models/preferences.model.js';

/**
 * RecommendationsModule
 *
 * Provides personalized property recommendations for tenants.
 * Scores properties using 4 weighted sub-models (Affordability, Risk Fit, Profile Strength, Preferences).
 * Exposes REST endpoints for recommendations with filtering, sorting, and pagination.
 */
@Module({
  imports: [UsersModule, PropertiesModule],
  controllers: [RecommendationsController],
  providers: [
    // Scoring models
    AffordabilityModel,
    RiskFitModel,
    ProfileStrengthModel,
    PreferencesModel,
    // Aggregator
    RecommendationScorer,
    // Service
    RecommendationsService,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
