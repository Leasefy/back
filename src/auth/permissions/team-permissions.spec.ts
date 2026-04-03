import { TEAM_ROLE_PERMISSIONS } from './team-role-permissions';
import type { TeamPermissions, TeamResource, TeamAction } from './team-role-permissions';

/**
 * Unit tests for team permission resolution logic.
 *
 * Tests the permission matrix used by TeamAccessGuard:
 * - Owner has full access to all resources
 * - Admin role has full team management + operations
 * - Manager cannot manage team or billing
 * - Accountant only sees billing, reports, leases (read-only)
 * - Viewer only sees properties, candidates, contracts, reports (read-only)
 * - Pending invitation → no accepted membership → should be denied
 */

/**
 * Utility: check if a team role has permission for a resource+action.
 * Mirrors the logic in TeamAccessGuard.canActivate().
 */
function hasTeamPermission(
  role: string,
  resource: TeamResource,
  action: TeamAction,
): boolean {
  const permissions: TeamPermissions = TEAM_ROLE_PERMISSIONS[role] ?? {};
  const allowedActions: TeamAction[] =
    (permissions[resource] as TeamAction[] | undefined) ?? [];
  return allowedActions.includes(action);
}

describe('Team Permission Resolution', () => {
  describe('Owner (direct landlord)', () => {
    // Owner logic is in TeamAccessGuard — when ownPropertyCount > 0, owner passes always.
    // The guard returns true before checking TEAM_ROLE_PERMISSIONS.
    // We verify that the full permission set for "admin" covers all key resources.
    it('admin role should have full CRUD on properties', () => {
      expect(hasTeamPermission('admin', 'properties', 'view')).toBe(true);
      expect(hasTeamPermission('admin', 'properties', 'create')).toBe(true);
      expect(hasTeamPermission('admin', 'properties', 'edit')).toBe(true);
      expect(hasTeamPermission('admin', 'properties', 'delete')).toBe(true);
    });

    it('admin role should have full team management', () => {
      expect(hasTeamPermission('admin', 'team', 'view')).toBe(true);
      expect(hasTeamPermission('admin', 'team', 'create')).toBe(true);
      expect(hasTeamPermission('admin', 'team', 'edit')).toBe(true);
      expect(hasTeamPermission('admin', 'team', 'delete')).toBe(true);
    });

    it('admin role should be able to manage candidates, contracts, visits', () => {
      expect(hasTeamPermission('admin', 'candidates', 'view')).toBe(true);
      expect(hasTeamPermission('admin', 'candidates', 'edit')).toBe(true);
      expect(hasTeamPermission('admin', 'contracts', 'view')).toBe(true);
      expect(hasTeamPermission('admin', 'contracts', 'create')).toBe(true);
      expect(hasTeamPermission('admin', 'visits', 'view')).toBe(true);
      expect(hasTeamPermission('admin', 'visits', 'create')).toBe(true);
      expect(hasTeamPermission('admin', 'visits', 'delete')).toBe(true);
    });
  });

  describe('manager role', () => {
    it('should allow manager to view+create+edit properties', () => {
      expect(hasTeamPermission('manager', 'properties', 'view')).toBe(true);
      expect(hasTeamPermission('manager', 'properties', 'create')).toBe(true);
      expect(hasTeamPermission('manager', 'properties', 'edit')).toBe(true);
    });

    it('should deny manager from deleting properties', () => {
      expect(hasTeamPermission('manager', 'properties', 'delete')).toBe(false);
    });

    it('should deny manager from accessing team management', () => {
      expect(hasTeamPermission('manager', 'team', 'view')).toBe(false);
      expect(hasTeamPermission('manager', 'team', 'create')).toBe(false);
      expect(hasTeamPermission('manager', 'team', 'edit')).toBe(false);
    });

    it('should deny manager from accessing billing', () => {
      expect(hasTeamPermission('manager', 'billing', 'view')).toBe(false);
    });

    it('should allow manager to manage candidates, contracts, visits', () => {
      expect(hasTeamPermission('manager', 'candidates', 'view')).toBe(true);
      expect(hasTeamPermission('manager', 'contracts', 'view')).toBe(true);
      expect(hasTeamPermission('manager', 'contracts', 'create')).toBe(true);
      expect(hasTeamPermission('manager', 'visits', 'view')).toBe(true);
      expect(hasTeamPermission('manager', 'visits', 'create')).toBe(true);
      expect(hasTeamPermission('manager', 'visits', 'edit')).toBe(true);
    });
  });

  describe('accountant role', () => {
    it('should allow accountant to view billing, reports, leases', () => {
      expect(hasTeamPermission('accountant', 'billing', 'view')).toBe(true);
      expect(hasTeamPermission('accountant', 'reports', 'view')).toBe(true);
      expect(hasTeamPermission('accountant', 'leases', 'view')).toBe(true);
    });

    it('should deny accountant from any write actions', () => {
      expect(hasTeamPermission('accountant', 'billing', 'edit')).toBe(false);
      expect(hasTeamPermission('accountant', 'leases', 'edit')).toBe(false);
      expect(hasTeamPermission('accountant', 'reports', 'create')).toBe(false);
    });

    it('should deny accountant from accessing properties, candidates, contracts', () => {
      expect(hasTeamPermission('accountant', 'properties', 'view')).toBe(false);
      expect(hasTeamPermission('accountant', 'candidates', 'view')).toBe(false);
      expect(hasTeamPermission('accountant', 'contracts', 'view')).toBe(false);
    });

    it('should deny accountant from accessing team management', () => {
      expect(hasTeamPermission('accountant', 'team', 'view')).toBe(false);
    });
  });

  describe('viewer role', () => {
    it('should allow viewer to view properties, candidates, contracts, reports', () => {
      expect(hasTeamPermission('viewer', 'properties', 'view')).toBe(true);
      expect(hasTeamPermission('viewer', 'candidates', 'view')).toBe(true);
      expect(hasTeamPermission('viewer', 'contracts', 'view')).toBe(true);
      expect(hasTeamPermission('viewer', 'reports', 'view')).toBe(true);
    });

    it('should deny viewer from any create/edit/delete actions', () => {
      expect(hasTeamPermission('viewer', 'properties', 'create')).toBe(false);
      expect(hasTeamPermission('viewer', 'properties', 'edit')).toBe(false);
      expect(hasTeamPermission('viewer', 'properties', 'delete')).toBe(false);
      expect(hasTeamPermission('viewer', 'contracts', 'create')).toBe(false);
    });

    it('should deny viewer from accessing team management', () => {
      expect(hasTeamPermission('viewer', 'team', 'view')).toBe(false);
    });

    it('should deny viewer from accessing billing, leases, visits', () => {
      expect(hasTeamPermission('viewer', 'billing', 'view')).toBe(false);
      expect(hasTeamPermission('viewer', 'leases', 'view')).toBe(false);
      expect(hasTeamPermission('viewer', 'visits', 'view')).toBe(false);
    });
  });

  describe('Unknown/pending invitation', () => {
    it('should return false for unknown role on any resource', () => {
      expect(hasTeamPermission('pending', 'properties', 'view')).toBe(false);
      expect(hasTeamPermission('expired', 'contracts', 'view')).toBe(false);
      expect(hasTeamPermission('', 'reports', 'view')).toBe(false);
    });

    it('should return empty permissions for unrecognized role', () => {
      expect(TEAM_ROLE_PERMISSIONS['nonexistent']).toBeUndefined();
      expect(TEAM_ROLE_PERMISSIONS['pending']).toBeUndefined();
    });
  });

  describe('Permission matrix completeness', () => {
    it('should define all 4 expected roles', () => {
      expect(TEAM_ROLE_PERMISSIONS['admin']).toBeDefined();
      expect(TEAM_ROLE_PERMISSIONS['manager']).toBeDefined();
      expect(TEAM_ROLE_PERMISSIONS['accountant']).toBeDefined();
      expect(TEAM_ROLE_PERMISSIONS['viewer']).toBeDefined();
    });
  });
});
