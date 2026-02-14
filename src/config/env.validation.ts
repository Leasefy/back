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

  /** Redis connection URL for BullMQ (e.g., Upstash: rediss://...) */
  @IsString()
  REDIS_URL!: string;

  // ============================================
  // Notifications (Phase 11)
  // ============================================

  /** Resend API key for email delivery */
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  RESEND_API_KEY?: string;

  /** Email from address (defaults to 'notificaciones@arriendofacil.co') */
  @IsString()
  @IsOptional()
  @IsEmail()
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

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';
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
