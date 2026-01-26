import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Global authentication guard that validates Supabase JWT tokens.
 *
 * All routes require authentication by default.
 * Use @Public() decorator to mark routes that don't need authentication.
 *
 * @example
 * ```ts
 * // Protected by default
 * @Get('profile')
 * getProfile() { ... }
 *
 * // Public route
 * @Public()
 * @Get('health')
 * health() { ... }
 * ```
 */
@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase') {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * Checks if the route is public before performing JWT validation.
   *
   * @param context - Execution context with handler and class metadata
   * @returns true if public route, otherwise JWT validation result
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
