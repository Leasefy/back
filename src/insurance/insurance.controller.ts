import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { InsuranceService } from './insurance.service.js';
import { InsuranceTier } from '../common/enums/index.js';

/**
 * InsuranceController
 *
 * Public endpoints for insurance tier information.
 * No authentication required - allows frontend to display
 * insurance options during contract creation.
 *
 * Requirements: INSU-01, INSU-04
 */
@ApiTags('Insurance')
@Controller('insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  /**
   * GET /insurance/tiers
   * List all available insurance tiers with pricing and coverage.
   * Public endpoint.
   *
   * Requirements: INSU-01
   */
  @Get('tiers')
  @Public()
  @ApiOperation({ summary: 'List available insurance tiers' })
  @ApiResponse({
    status: 200,
    description: 'List of insurance tiers with pricing and coverage details',
  })
  getAllTiers() {
    return this.insuranceService.getAllTiers();
  }

  /**
   * GET /insurance/tiers/:tier
   * Get coverage details for a specific insurance tier.
   * Public endpoint.
   *
   * Requirements: INSU-04
   */
  @Get('tiers/:tier')
  @Public()
  @ApiOperation({ summary: 'Get insurance tier details' })
  @ApiParam({
    name: 'tier',
    enum: InsuranceTier,
    description: 'Insurance tier: NONE, BASIC, or PREMIUM',
  })
  @ApiResponse({
    status: 200,
    description: 'Insurance tier details with pricing and coverage',
  })
  @ApiResponse({ status: 400, description: 'Invalid tier value' })
  getTierDetails(@Param('tier') tier: string) {
    // Validate tier is a valid enum value, try uppercase for case-insensitive convenience
    const normalizedTier = tier.toUpperCase();
    if (this.insuranceService.isValidTier(normalizedTier)) {
      return this.insuranceService.getTierDetails(normalizedTier as InsuranceTier);
    }
    // Will throw BadRequestException for invalid tier
    return this.insuranceService.getTierDetails(tier as InsuranceTier);
  }
}
