import { Injectable } from '@nestjs/common';
import type { Driver } from '../aggregator/risk-score-result.interface.js';
import type { Signal } from '../models/model-result.interface.js';
import type { RiskScoreResultData } from '../aggregator/risk-score-result.interface.js';
import {
  DriverExplanationDto,
  type DriverCategory,
  type DriverIcon,
} from './dto/index.js';

/**
 * DriverFormatterService
 *
 * Enriches raw drivers with category and icon metadata for UI rendering.
 * Matches drivers to their original signals to infer category.
 */
@Injectable()
export class DriverFormatterService {
  /**
   * Format drivers by matching them to signals and adding category/icon metadata.
   *
   * @param drivers - Raw drivers from score aggregator
   * @param signals - All signals from scoring models
   * @param result - Complete score result for context
   * @returns Enriched drivers with category and icon
   */
  format(
    drivers: Driver[],
    signals: Signal[],
    result: RiskScoreResultData,
  ): DriverExplanationDto[] {
    return drivers.map((driver) => {
      // Find matching signal by text
      const matchingSignal = signals.find((s) => s.message === driver.text);

      // Infer category from signal code
      const category = matchingSignal
        ? this.inferCategory(matchingSignal.code)
        : 'integrity';

      // Determine icon based on positive/negative and category
      const icon = this.determineIcon(driver.positive, category);

      return {
        text: driver.text,
        positive: driver.positive,
        category,
        icon,
      };
    });
  }

  /**
   * Infer driver category from signal code.
   *
   * @param code - Signal code (e.g., 'LOW_RTI', 'STABLE_EMPLOYMENT')
   * @returns Category for this signal
   */
  private inferCategory(code: string): DriverCategory {
    const codeUpper = code.toUpperCase();

    // Financial indicators
    if (
      codeUpper.includes('RTI') ||
      codeUpper.includes('DTI') ||
      codeUpper.includes('BUFFER') ||
      codeUpper.includes('INCOME') ||
      codeUpper.includes('RENT_RATIO') ||
      codeUpper.includes('DISPOSABLE')
    ) {
      return 'financial';
    }

    // Stability indicators
    if (
      codeUpper.includes('EMPLOYMENT') ||
      codeUpper.includes('TENURE') ||
      codeUpper.includes('EMPLOYER') ||
      codeUpper.includes('JOB')
    ) {
      return 'stability';
    }

    // History indicators
    if (
      codeUpper.includes('REFERENCE') ||
      codeUpper.includes('RENTAL_HISTORY') ||
      codeUpper.includes('LANDLORD_REF')
    ) {
      return 'history';
    }

    // Payment history indicators
    if (
      codeUpper.includes('PAYMENT_HISTORY') ||
      codeUpper.includes('ON_TIME') ||
      codeUpper.includes('LATE_PAYMENT') ||
      codeUpper.includes('RETURNING') ||
      codeUpper.includes('MONTHS_ON_PLATFORM')
    ) {
      return 'paymentHistory';
    }

    // Document verification indicators
    if (
      codeUpper.includes('DOC_VERIFICATION') ||
      codeUpper.includes('DOCUMENT') ||
      codeUpper.includes('OCR')
    ) {
      return 'documentVerification';
    }

    // Default to integrity for unknown signals
    return 'integrity';
  }

  /**
   * Determine appropriate icon for a driver.
   *
   * @param positive - Whether driver is positive
   * @param category - Driver category
   * @returns Icon to display
   */
  private determineIcon(
    positive: boolean,
    category: DriverCategory,
  ): DriverIcon {
    if (positive) {
      return 'trending_up';
    }

    // Negative drivers
    if (category === 'integrity') {
      // Integrity issues are warnings
      return 'warning';
    }

    // Other negative drivers are trending down
    return 'trending_down';
  }
}
