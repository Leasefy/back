import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for public routes.
 * Used by SupabaseAuthGuard to bypass authentication.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route or controller as public, bypassing authentication.
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * health() { return { status: 'ok' }; }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
