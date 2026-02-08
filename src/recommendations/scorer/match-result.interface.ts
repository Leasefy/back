/**
 * Sub-model result from individual scoring models.
 */
export interface SubModelResult {
  score: number; // 0-100
  label: string; // Spanish explanation
}

/**
 * Complete match result for a property-tenant pair.
 */
export interface MatchResult {
  propertyId: string;
  matchScore: number; // 0-100 (weighted aggregate)
  acceptanceProbability: 'alta' | 'media' | 'baja';
  matchFactors: {
    affordability: SubModelResult;
    riskFit: SubModelResult;
    profileStrength: SubModelResult;
    preferences: SubModelResult;
  };
  recommendation: string; // Spanish human-readable explanation
}
