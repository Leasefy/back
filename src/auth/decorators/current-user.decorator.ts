import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { User } from '@prisma/client';
import type { Request } from 'express';

/**
 * Parameter decorator to extract the current authenticated user from the request.
 *
 * @param data - Optional property name to extract from the user object
 * @returns The full user object, or a specific property if data is provided
 *
 * @example
 * ```ts
 * // Get full user object
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * // Get specific field
 * @Get('my-id')
 * getMyId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
