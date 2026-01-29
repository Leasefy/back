import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsUrl,
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
