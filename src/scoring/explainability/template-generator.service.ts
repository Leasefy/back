import { Injectable } from '@nestjs/common';
import type { RiskScoreResultData } from '../aggregator/risk-score-result.interface.js';
import type { DriverExplanationDto } from './dto/index.js';

/**
 * TemplateGeneratorService
 *
 * Generates structured Spanish narratives using templates (no AI).
 * Used as fallback when Cohere is unavailable or for non-premium users.
 */
@Injectable()
export class TemplateGeneratorService {
  /**
   * Generate a narrative explanation from a template.
   *
   * @param result - Complete score result
   * @param drivers - Formatted drivers
   * @returns Spanish narrative
   */
  generate(result: RiskScoreResultData, drivers: DriverExplanationDto[]): string {
    const levelLabel = this.getLevelLabel(result.level);
    const positiveDrivers = drivers.filter((d) => d.positive);
    const negativeDrivers = drivers.filter((d) => !d.positive);

    // Paragraph 1: Score + level + summary
    let narrative = `Este candidato obtuvo un puntaje de ${result.total} puntos, clasificación ${levelLabel}. `;

    if (positiveDrivers.length > negativeDrivers.length) {
      narrative += 'El perfil presenta fortalezas significativas.';
    } else if (negativeDrivers.length > positiveDrivers.length) {
      narrative += 'Se identificaron algunas áreas de preocupación.';
    } else {
      narrative += 'El perfil muestra un balance entre fortalezas y debilidades.';
    }

    narrative += '\n\n';

    // Paragraph 2: Top 4 drivers listed
    narrative += 'Factores principales:\n';
    const topDrivers = drivers.slice(0, 4);
    topDrivers.forEach((driver, index) => {
      const prefix = driver.positive ? '✓' : '✗';
      narrative += `${prefix} ${driver.text}\n`;
    });

    // Paragraph 3: Flags and conditions if present
    if (result.flags.length > 0 || result.conditions.length > 0) {
      narrative += '\n';

      if (result.flags.length > 0) {
        narrative += `Alertas identificadas: ${result.flags.length} señal(es) de precaución. `;
      }

      if (result.conditions.length > 0) {
        const requiredConditions = result.conditions.filter((c) => c.required);
        if (requiredConditions.length > 0) {
          narrative += `Se recomienda ${requiredConditions.length} condición(es) especial(es) para mitigar riesgos.`;
        } else {
          narrative += `Se sugiere ${result.conditions.length} condición(es) opcional(es) para mayor seguridad.`;
        }
      }
    }

    return narrative.trim();
  }

  /**
   * Get Spanish label for risk level.
   *
   * @param level - Risk level (A-D)
   * @returns Spanish label
   */
  private getLevelLabel(level: string): string {
    switch (level) {
      case 'A':
        return 'A (Excelente)';
      case 'B':
        return 'B (Bueno)';
      case 'C':
        return 'C (Regular)';
      case 'D':
        return 'D (Alto Riesgo)';
      default:
        return level;
    }
  }
}
