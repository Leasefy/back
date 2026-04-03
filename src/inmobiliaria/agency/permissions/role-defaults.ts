import { AgencyMemberRole } from '../../../common/enums/agency-member-role.enum.js';
import type { AgencyPermissions } from './agency-permissions.js';

/**
 * Default permission matrix for each agency member role.
 *
 * Used when AgencyMember.permissions is null.
 * ADMIN always bypasses this check entirely in AgencyPermissionGuard.
 *
 * Permission levels:
 * - AGENTE: Can view/create/edit in their operational modules; no financial or config access
 * - CONTADOR: Full financial access; no pipeline, portafolio, agentes
 * - VIEWER: Read-only (view) in a limited set of modules; no write access
 */
export const AGENCY_ROLE_DEFAULTS: Record<
  Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>,
  AgencyPermissions
> = {
  [AgencyMemberRole.AGENTE]: {
    dashboard: ['view'],
    propietarios: ['view', 'create', 'edit'],
    portafolio: ['view', 'create', 'edit'],
    pipeline: ['view', 'create', 'edit'],
    agentes: ['view'],
    cobros: ['view', 'create', 'edit'],
    dispersiones: ['view'],
    operaciones: ['view', 'create', 'edit'],
    reportes: ['view'],
    configuracion: [],
    documentos: ['view', 'create', 'edit'],
    analytics: ['view'],
  },

  [AgencyMemberRole.CONTADOR]: {
    dashboard: ['view'],
    propietarios: ['view'],
    portafolio: [],
    pipeline: [],
    agentes: ['view'],
    cobros: ['view', 'create', 'edit', 'export'],
    dispersiones: ['view', 'create', 'edit', 'export'],
    operaciones: ['view'],
    reportes: ['view', 'export'],
    configuracion: [],
    documentos: ['view'],
    analytics: ['view', 'export'],
  },

  [AgencyMemberRole.VIEWER]: {
    dashboard: ['view'],
    propietarios: ['view'],
    portafolio: ['view'],
    pipeline: ['view'],
    agentes: ['view'],
    cobros: ['view'],
    dispersiones: ['view'],
    operaciones: ['view'],
    reportes: ['view'],
    configuracion: [],
    documentos: ['view'],
    analytics: ['view'],
  },
};
