/**
 * Granular permission types for agency members.
 *
 * Each agency member can have permissions overridden per module+action.
 * When `permissions` is null on AgencyMember, defaults from AGENCY_ROLE_DEFAULTS apply.
 */

export const AGENCY_MODULES = [
  'dashboard',
  'propietarios',
  'portafolio',
  'pipeline',
  'agentes',
  'cobros',
  'dispersiones',
  'operaciones',
  'reportes',
  'configuracion',
  'documentos',
  'analytics',
] as const;

export type AgencyModule = (typeof AGENCY_MODULES)[number];

export const AGENCY_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'export',
] as const;

export type AgencyAction = (typeof AGENCY_ACTIONS)[number];

export type AgencyPermissions = {
  [M in AgencyModule]?: AgencyAction[];
};
