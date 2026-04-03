import { SetMetadata } from '@nestjs/common';
import type { AgencyModule, AgencyAction } from '../permissions/agency-permissions.js';

/**
 * Metadata key used by AgencyPermissionGuard to read required permission.
 */
export const AGENCY_PERMISSION_KEY = 'agency_permission';

/**
 * Shape of the metadata stored by @RequirePermission.
 */
export interface AgencyPermissionMeta {
  module: AgencyModule;
  action: AgencyAction;
}

/**
 * Decorator that marks an endpoint with the required agency permission.
 *
 * @param module - The agency module (e.g. 'propietarios', 'cobros')
 * @param action - The action (e.g. 'view', 'create', 'edit', 'delete', 'export')
 *
 * @example
 * ```ts
 * @RequirePermission('propietarios', 'create')
 * @Post()
 * async create(...) {}
 * ```
 */
export const RequirePermission = (module: AgencyModule, action: AgencyAction) =>
  SetMetadata<string, AgencyPermissionMeta>(AGENCY_PERMISSION_KEY, {
    module,
    action,
  });
