import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { User } from '@prisma/client';
import { Role as PrismaRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * JWT payload from Supabase auth tokens.
 */
interface SupabaseJwtPayload {
  /** User UUID (Supabase auth.users.id) */
  sub: string;
  /** User email */
  email: string;
  /** Token issued at (Unix timestamp) */
  iat: number;
  /** Token expiration (Unix timestamp) */
  exp: number;
  /** Token issuer (Supabase URL + /auth/v1) */
  iss: string;
  /** Audience */
  aud: string;
  /** Role in Supabase (authenticated, anon) */
  role: string;
  /** Custom user_metadata from OAuth provider or client updates */
  user_metadata?: {
    email?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
    role?: string;
  };
}

/**
 * Passport strategy for validating Supabase JWT tokens using JWKS.
 *
 * Uses jwks-rsa to fetch Supabase's JSON Web Key Set for signature verification.
 * After JWT validation, looks up the user in the database.
 *
 * The validated user is attached to request.user for downstream guards/controllers.
 */
@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  private readonly logger = new Logger(SupabaseStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL')!;
    const jwksUrl = configService.get<string>('SUPABASE_JWKS_URL')!;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `${supabaseUrl}/auth/v1`,
      algorithms: ['ES256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUrl,
      }),
    });
  }

  /**
   * Validates the JWT payload and returns the user from the database.
   *
   * If the JWT is valid but the user doesn't exist in `public.users`
   * (e.g. after a DB reset, first login after OAuth registration, or a
   * user created in Supabase Auth out-of-band), this method auto-provisions
   * the user record with data from the JWT payload.
   *
   * The auto-provisioned user defaults to role TENANT — the user (or an admin)
   * can update their role later via the onboarding flow or profile endpoint.
   *
   * @param payload - Decoded JWT payload from Supabase
   * @returns The user record from the database
   */
  async validate(payload: SupabaseJwtPayload): Promise<User> {
    const userId = payload.sub;

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (existing) {
      return existing;
    }

    // User exists in Supabase Auth but not in public.users — auto-provision
    this.logger.log(
      `Auto-provisioning user ${userId} (${payload.email}) from JWT metadata`,
    );

    const metadata = payload.user_metadata ?? {};
    const fullName = metadata.full_name ?? metadata.name ?? '';
    const [firstNameFromFull, ...restName] = fullName.trim().split(/\s+/);
    const lastNameFromFull = restName.join(' ') || null;

    const firstName = metadata.first_name ?? firstNameFromFull ?? null;
    const lastName = metadata.last_name ?? lastNameFromFull;
    const avatarUrl = metadata.avatar_url ?? metadata.picture ?? null;

    // Respect role from metadata if it matches a valid enum value, otherwise
    // default to TENANT (least privileged).
    const metadataRole = metadata.role?.toUpperCase();
    const role: PrismaRole =
      metadataRole && Object.values(PrismaRole).includes(metadataRole as PrismaRole)
        ? (metadataRole as PrismaRole)
        : PrismaRole.TENANT;

    try {
      const created = await this.prisma.user.create({
        data: {
          id: userId,
          email: payload.email,
          role,
          firstName,
          lastName,
          avatarUrl,
          isActive: true,
          emailNotificationsEnabled: true,
          pushNotificationsEnabled: true,
        },
      });
      return created;
    } catch (err) {
      this.logger.error(
        `Failed to auto-provision user ${userId}: ${(err as Error).message}`,
      );
      throw new UnauthorizedException(
        'No se pudo crear el registro de usuario. Intenta nuevamente o contacta soporte.',
      );
    }
  }
}
