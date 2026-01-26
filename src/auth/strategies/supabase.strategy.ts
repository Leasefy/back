import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { User } from '@prisma/client';
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
   * @param payload - Decoded JWT payload from Supabase
   * @returns The user record from the database
   * @throws UnauthorizedException if user not found in database
   */
  async validate(payload: SupabaseJwtPayload): Promise<User> {
    const userId = payload.sub;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User not found. Please ensure your account is set up correctly.',
      );
    }

    return user;
  }
}
