import { AgencyMemberRole } from '../../../common/enums/agency-member-role.enum';
import { AGENCY_ROLE_DEFAULTS } from './role-defaults';
import type { AgencyPermissions, AgencyModule, AgencyAction } from './agency-permissions';

/**
 * Unit tests for agency permission resolution logic.
 *
 * Tests the core logic used by AgencyPermissionGuard:
 * - ADMIN always bypasses permission checks
 * - Custom permissions are used when provided
 * - Role defaults are used when custom permissions are null
 * - Returns false for missing permissions
 */

/**
 * Utility: resolve effective permissions for a role/custom-permissions combo.
 * Mirrors the logic in AgencyPermissionGuard.canActivate().
 */
function hasAgencyPermission(
  role: AgencyMemberRole,
  module: AgencyModule,
  action: AgencyAction,
  customPermissions: AgencyPermissions | null = null,
): boolean {
  // ADMIN bypasses all permission checks
  if (role === AgencyMemberRole.ADMIN) {
    return true;
  }

  const effectivePermissions: AgencyPermissions =
    customPermissions != null
      ? customPermissions
      : (AGENCY_ROLE_DEFAULTS[role as Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>] ?? {});

  const allowedActions: AgencyAction[] =
    (effectivePermissions[module] as AgencyAction[] | undefined) ?? [];

  return allowedActions.includes(action);
}

describe('Agency Permission Resolution', () => {
  describe('ADMIN role', () => {
    it('should return true for ADMIN regardless of module/action', () => {
      expect(hasAgencyPermission(AgencyMemberRole.ADMIN, 'dashboard', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.ADMIN, 'configuracion', 'delete')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.ADMIN, 'reportes', 'export')).toBe(true);
    });

    it('should return true for ADMIN even with null custom permissions', () => {
      expect(hasAgencyPermission(AgencyMemberRole.ADMIN, 'analytics', 'delete', null)).toBe(true);
    });
  });

  describe('AGENTE role - default permissions', () => {
    it('should allow AGENTE to view dashboard', () => {
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'dashboard', 'view')).toBe(true);
    });

    it('should allow AGENTE to view+create+edit portafolio', () => {
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'create')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'edit')).toBe(true);
    });

    it('should allow AGENTE to view+create+edit pipeline', () => {
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'create')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'edit')).toBe(true);
    });

    it('should deny AGENTE delete on portafolio', () => {
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'delete')).toBe(false);
    });

    it('should deny AGENTE access to configuracion', () => {
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'view')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'edit')).toBe(false);
    });
  });

  describe('CONTADOR role - default permissions', () => {
    it('should allow CONTADOR to view+edit cobros and dispersiones', () => {
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'cobros', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'cobros', 'edit')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'dispersiones', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'dispersiones', 'edit')).toBe(true);
    });

    it('should allow CONTADOR to export reportes and analytics', () => {
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'reportes', 'export')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'analytics', 'export')).toBe(true);
    });

    it('should deny CONTADOR access to portafolio', () => {
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'portafolio', 'view')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'portafolio', 'edit')).toBe(false);
    });

    it('should deny CONTADOR access to pipeline', () => {
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'pipeline', 'view')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'pipeline', 'create')).toBe(false);
    });

    it('should deny CONTADOR access to configuracion', () => {
      expect(hasAgencyPermission(AgencyMemberRole.CONTADOR, 'configuracion', 'view')).toBe(false);
    });
  });

  describe('VIEWER role - default permissions', () => {
    it('should allow VIEWER to view dashboard, propietarios, portafolio, cobros, reportes', () => {
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'dashboard', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'propietarios', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'cobros', 'view')).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'reportes', 'view')).toBe(true);
    });

    it('should deny VIEWER any create/edit/delete/export actions', () => {
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'create')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'edit')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'cobros', 'delete')).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'reportes', 'export')).toBe(false);
    });

    it('should deny VIEWER access to configuracion', () => {
      expect(hasAgencyPermission(AgencyMemberRole.VIEWER, 'configuracion', 'view')).toBe(false);
    });
  });

  describe('Custom permissions override', () => {
    it('should use custom permissions when provided (overrides role defaults)', () => {
      // AGENTE normally cannot access configuracion
      const customPermissions: AgencyPermissions = {
        configuracion: ['view', 'edit'],
        reportes: ['view', 'export'],
      };

      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'view', customPermissions)).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'edit', customPermissions)).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'export', customPermissions)).toBe(true);
    });

    it('should fall back to role defaults when custom permissions are null', () => {
      // AGENTE with null custom perms → should use defaults
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'view', null)).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'view', null)).toBe(false);
    });

    it('should return false for modules not included in custom permissions', () => {
      // Custom permissions only grants portafolio; other modules should be denied
      const customPermissions: AgencyPermissions = {
        portafolio: ['view'],
      };

      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'view', customPermissions)).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'dashboard', 'view', customPermissions)).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'view', customPermissions)).toBe(false);
    });

    it('should return false for actions not included in custom permissions for that module', () => {
      const customPermissions: AgencyPermissions = {
        reportes: ['view'],
      };

      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'view', customPermissions)).toBe(true);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'export', customPermissions)).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'edit', customPermissions)).toBe(false);
    });
  });

  describe('Permission resolution with empty custom permissions object', () => {
    it('should return false for all actions when custom permissions has empty array for module', () => {
      const customPermissions: AgencyPermissions = {
        reportes: [],
      };

      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'view', customPermissions)).toBe(false);
      expect(hasAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'export', customPermissions)).toBe(false);
    });
  });
});
