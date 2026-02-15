import { Injectable, Logger } from '@nestjs/common';
import { CohereService } from '../../ai/services/cohere.service.js';
import type { RiskScoreResultData } from '../aggregator/risk-score-result.interface.js';
import type { DriverExplanationDto } from './dto/index.js';

/**
 * NarrativeGeneratorService
 *
 * Generates natural language narratives using Cohere Command R+.
 * Produces Spanish explanations for risk scores with financial context.
 */
@Injectable()
export class NarrativeGeneratorService {
  private readonly logger = new Logger(NarrativeGeneratorService.name);

  constructor(private readonly cohereService: CohereService) {}

  /**
   * Generate a Spanish narrative explanation using AI.
   *
   * @param result - Complete score result
   * @param drivers - Formatted drivers
   * @returns Spanish narrative from Cohere
   * @throws Error if Cohere is unavailable or fails
   */
  async generate(
    result: RiskScoreResultData,
    drivers: DriverExplanationDto[],
  ): Promise<string> {
    const prompt = this.buildPrompt(result, drivers);
    const systemPrompt = this.buildSystemPrompt();

    this.logger.debug('Generating narrative with Cohere...');

    const response = await this.cohereService.analyze(systemPrompt, prompt);

    // Parse JSON response
    try {
      const parsed = JSON.parse(response.content);
      if (parsed.narrative && typeof parsed.narrative === 'string') {
        this.logger.debug(
          `Generated narrative (${response.tokensUsed} tokens)`,
        );
        return parsed.narrative;
      }
      // Fallback if JSON doesn't have expected structure
      this.logger.warn('Unexpected JSON structure, using raw content');
      return response.content;
    } catch (error) {
      // Fallback to raw content if JSON parsing fails
      this.logger.warn('Failed to parse JSON response, using raw content');
      return response.content;
    }
  }

  /**
   * Build system prompt for Cohere.
   *
   * @returns System prompt defining the task
   */
  private buildSystemPrompt(): string {
    return `Eres un asistente especializado en explicar evaluaciones de riesgo crediticio para arriendos en Colombia.

Tu tarea es generar una explicación clara y profesional en español que ayude a propietarios a entender por qué un candidato recibió cierto puntaje.

IMPORTANTE: Debes responder en formato JSON con un único campo:
{ "narrative": "tu explicación aquí" }

La narrativa debe:
- Ser clara y profesional (2-3 párrafos)
- Explicar el puntaje y la clasificación
- Mencionar los factores principales que influyeron
- Destacar fortalezas y debilidades del candidato
- Mencionar alertas o condiciones si existen
- Usar términos financieros apropiados para el contexto colombiano
- Ser objetiva y basada en datos`;
  }

  /**
   * Build user prompt with scoring data.
   *
   * @param result - Complete score result
   * @param drivers - Formatted drivers
   * @returns User prompt with data
   */
  private buildPrompt(
    result: RiskScoreResultData,
    drivers: DriverExplanationDto[],
  ): string {
    const levelLabels: Record<string, string> = {
      A: 'A (Excelente)',
      B: 'B (Bueno)',
      C: 'C (Regular)',
      D: 'D (Alto Riesgo)',
    };

    const levelLabel = levelLabels[result.level] || result.level;

    let prompt = `Genera una explicación para este resultado de evaluación:

PUNTAJE: ${result.total}/100
CLASIFICACIÓN: ${levelLabel}

CATEGORÍAS:
- Situación Financiera: ${result.categories.financial}/${35}
- Estabilidad Laboral: ${result.categories.stability}/${25}
- Historial de Referencias: ${result.categories.history}/${15}
- Integridad de Datos: ${result.categories.integrity}/${25}`;

    if (result.categories.paymentHistory !== undefined) {
      prompt += `\n- Historial de Pagos: +${result.categories.paymentHistory} puntos bonus`;
    }

    if (result.categories.documentVerification !== undefined) {
      prompt += `\n- Verificación de Documentos: +${result.categories.documentVerification} puntos bonus`;
    }

    prompt += '\n\nFACTORES PRINCIPALES:\n';
    drivers.forEach((driver, index) => {
      const icon = driver.positive ? '✓' : '✗';
      prompt += `${index + 1}. ${icon} ${driver.text}\n`;
    });

    if (result.flags.length > 0) {
      prompt += '\nALERTAS:\n';
      result.flags.forEach((flag) => {
        prompt += `- [${flag.severity}] ${flag.message}\n`;
      });
    }

    if (result.conditions.length > 0) {
      prompt += '\nCONDICIONES SUGERIDAS:\n';
      result.conditions.forEach((condition) => {
        const required = condition.required ? 'Requerida' : 'Opcional';
        prompt += `- [${required}] ${condition.message}\n`;
      });
    }

    return prompt;
  }
}
