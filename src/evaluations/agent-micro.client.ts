import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TenantScoringPayload } from './dto/index.js';

@Injectable()
export class AgentMicroClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(AgentMicroClient.name);

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('AGENT_MICRO_URL') ??
      'http://localhost:4000';
  }

  /**
   * Starts an async evaluation on the agent microservice.
   * Requires the user's Supabase JWT to authenticate against the micro's jwtMiddleware.
   */
  async startEvaluation(
    payload: TenantScoringPayload,
    userAccessToken: string,
  ): Promise<{ runId: string }> {
    const url = `${this.baseUrl}/tenant-scoring`;
    this.logger.log(`POST ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userAccessToken}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      this.logger.error(`Micro unreachable: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'El microservicio de agentes no esta disponible',
      );
    }

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(
        `Micro POST /tenant-scoring failed: ${res.status} - ${errBody}`,
      );
      throw new ServiceUnavailableException(
        'El microservicio de agentes retorno un error',
      );
    }

    return res.json() as Promise<{ runId: string }>;
  }

  /**
   * Polls the agent microservice for an evaluation result.
   * Returns null if still processing, the full result object if completed.
   * Swallows transient errors — caller should retry via the polling loop.
   */
  async pollResult(
    runId: string,
    userAccessToken: string,
  ): Promise<Record<string, unknown> | null> {
    const url = `${this.baseUrl}/tenant-scoring/${runId}`;
    this.logger.debug(`GET ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${userAccessToken}` },
      });
    } catch (err) {
      this.logger.warn(`Micro poll unreachable: ${(err as Error).message}`);
      return null;
    }

    if (res.status === 202) return null;
    if (!res.ok) {
      this.logger.warn(
        `Micro GET /tenant-scoring/${runId} error: ${res.status}`,
      );
      return null;
    }

    return res.json() as Promise<Record<string, unknown>>;
  }
}
