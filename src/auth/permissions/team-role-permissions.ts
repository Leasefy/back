/**
 * Permission matrix for landlord team member roles.
 *
 * Defines what each team role can do across every resource.
 * Used by TeamAccessGuard to enforce access control.
 *
 * Roles:
 * - admin: Full management access (except some billing mutations)
 * - manager: Day-to-day operations (properties, candidates, contracts, visits)
 * - accountant: Read-only financial view (billing, reports, leases)
 * - viewer: Read-only overview (properties, candidates, contracts, reports)
 */

export const TEAM_RESOURCES = [
  'team',
  'billing',
  'properties',
  'candidates',
  'contracts',
  'reports',
  'leases',
  'visits',
  'messages',
  'settings',
] as const;

export type TeamResource = (typeof TEAM_RESOURCES)[number];

export const TEAM_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;

export type TeamAction = (typeof TEAM_ACTIONS)[number];

export type TeamPermissions = {
  [R in TeamResource]?: TeamAction[];
};

export const TEAM_ROLE_PERMISSIONS: Record<string, TeamPermissions> = {
  admin: {
    team: ['view', 'create', 'edit', 'delete'],
    billing: ['view', 'create', 'edit'],
    properties: ['view', 'create', 'edit', 'delete'],
    candidates: ['view', 'edit'],
    contracts: ['view', 'create', 'edit'],
    reports: ['view'],
    leases: ['view', 'edit'],
    visits: ['view', 'create', 'edit', 'delete'],
    messages: ['view', 'create'],
    settings: ['view', 'edit'],
  },
  manager: {
    properties: ['view', 'create', 'edit'],
    candidates: ['view', 'edit'],
    contracts: ['view', 'create', 'edit'],
    leases: ['view'],
    visits: ['view', 'create', 'edit'],
    messages: ['view', 'create'],
  },
  accountant: {
    billing: ['view'],
    reports: ['view'],
    leases: ['view'],
  },
  viewer: {
    properties: ['view'],
    candidates: ['view'],
    contracts: ['view'],
    reports: ['view'],
  },
};
