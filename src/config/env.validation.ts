import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
  IsEmail,
  IsNotEmpty,
  validateSync,
  Min,
  Max,
} from 'class-validator';

export class EnvironmentVariables {
  // ============================================
  // Database
  // ============================================

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  DIRECT_URL!: string;

  // ============================================
  // Supabase
  // ============================================

  /** Supabase project URL (e.g., https://xxx.supabase.co) */
  @IsUrl({ require_tld: false }) // allow localhost for dev
  SUPABASE_URL!: string;

  /** Supabase publishable/anon key */
  @IsString()
  SUPABASE_ANON_KEY!: string;

  /** Supabase service role key (for Storage operations) */
  @IsString()
  SUPABASE_SERVICE_KEY!: string;

  /** Supabase JWKS URL for JWT verification */
  @IsUrl({ require_tld: false })
  SUPABASE_JWKS_URL!: string;

  // ============================================
  // Redis (for BullMQ job queue)
  // ============================================

  /** Redis/Valkey connection URL for BullMQ.
   * Dev/Staging (Upstash): rediss://default:[token]@[instance].upstash.io:6379
   * Production (Valkey self-hosted): redis://:[password]@[ip-servidor]:6379
   */
  @IsString()
  REDIS_URL!: string;

  // ============================================
  // Notifications (Phase 11)
  // ============================================

  /** Brevo SMTP login (e.g. a2a941001@smtp-brevo.com) */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  BREVO_SMTP_USER?: string;

  /** Brevo SMTP password / API key */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  BREVO_SMTP_PASS?: string;

  /** Email from address (e.g. "Leasefy <user@gmail.com>") */
  @IsString()
  @IsOptional()
  EMAIL_FROM_ADDRESS?: string;

  /** Firebase project ID */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  FIREBASE_PROJECT_ID?: string;

  /** Firebase service account private key (contains \n escape sequences) */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  FIREBASE_PRIVATE_KEY?: string;

  /** Firebase service account client email */
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @IsOptional()
  FIREBASE_CLIENT_EMAIL?: string;

  // ============================================
  // Application
  // ============================================

  /** Comma-separated list of allowed CORS origins (e.g. "https://app.render.com,https://arriendofacil.com") */
  @IsString()
  @IsOptional()
  CORS_ORIGINS?: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';

  // ============================================
  // AI / Cohere (Phase 20)
  // ============================================

  /** Cohere API key for document analysis */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  COHERE_API_KEY?: string;

  /** AI model to use (default: command-r-plus) */
  @IsString()
  @IsOptional()
  AI_MODEL: string = 'command-r-plus';

  // ============================================
  // Agent Microservice (Phase 27)
  // ============================================

  /** Agent microservice URL for tenant scoring evaluations */
  @IsString()
  @IsOptional()
  AGENT_MICRO_URL: string = 'http://localhost:4000';

  // ============================================
  // PSE Payment Gateway
  // ============================================

  /**
   * PSE processing mode.
   * - `mock`: Use deterministic mock (dev/staging/testing). Results based on document last digit.
   * - `real`: Use real PSE gateway integration (production). Throws until implemented.
   * Default: 'mock' for safety.
   */
  @IsString()
  @IsOptional()
  PSE_MODE: string = 'mock';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });
  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
