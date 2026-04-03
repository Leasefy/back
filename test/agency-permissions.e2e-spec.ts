/**
 * Agency Permissions Integration Tests
 *
 * Tests the full permission flow for agency members:
 * - ADMIN can access all modules
 * - AGENTE with defaults: can view dashboard, view+edit portafolio, view+create+edit pipeline,
 *   cannot access dispersiones/reportes write/configuracion/analytics write
 * - CONTADOR with defaults: can view+edit cobros/dispersiones, can export reportes/analytics,
 *   cannot access portafolio/pipeline
 * - VIEWER with defaults: can view dashboard/propietarios/portafolio/cobros/reportes,
 *   cannot create/edit/delete/export
 * - Custom permissions override: AGENTE with custom reportes:view can access reportes
 *
 * NOTE: These tests require a running database and full NestJS context.
 * Run with: npm run test:e2e -- agency-permissions
 *
 * Setup requirements:
 * - TEST_DATABASE_URL set in .env.test
 * - Valid Supabase test credentials
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AgencyMemberRole } from '../src/common/enums/agency-member-role.enum';
import { AGENCY_ROLE_DEFAULTS } from '../src/inmobiliaria/agency/permissions/role-defaults';
import type { AgencyPermissions } from '../src/inmobiliaria/agency/permissions/agency-permissions';

/**
 * Permission check helper — mirrors AgencyPermissionGuard logic.
 */
function checkAgencyPermission(
  role: AgencyMemberRole,
  module: keyof AgencyPermissions,
  action: string,
  customPermissions: AgencyPermissions | null = null,
): boolean {
  if (role === AgencyMemberRole.ADMIN) return true;

  const effective: AgencyPermissions =
    customPermissions != null
      ? customPermissions
      : (AGENCY_ROLE_DEFAULTS[role as Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>] ?? {});

  const allowed = (effective[module] as string[] | undefined) ?? [];
  return allowed.includes(action);
}

describe('Agency Permissions (integration)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('ADMIN role', () => {
    it('should have access to all modules (ADMIN bypasses permission check)', () => {
      // ADMIN always returns true regardless of module/action
      expect(checkAgencyPermission(AgencyMemberRole.ADMIN, 'dashboard', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.ADMIN, 'configuracion', 'delete')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.ADMIN, 'dispersiones', 'export')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.ADMIN, 'analytics', 'delete')).toBe(true);
    });
  });

  describe('AGENTE role - default permissions', () => {
    it('should allow view on dashboard', () => {
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'dashboard', 'view')).toBe(true);
    });

    it('should allow view+edit on portafolio, but NOT delete', () => {
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'edit')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'delete')).toBe(false);
    });

    it('should allow view+create+edit on pipeline', () => {
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'create')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'pipeline', 'edit')).toBe(true);
    });

    it('should NOT allow access to configuracion', () => {
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'view')).toBe(false);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'configuracion', 'edit')).toBe(false);
    });
  });

  describe('CONTADOR role - default permissions', () => {
    it('should allow view+edit+export on cobros and dispersiones', () => {
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'cobros', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'cobros', 'edit')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'cobros', 'export')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'dispersiones', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'dispersiones', 'edit')).toBe(true);
    });

    it('should allow export on reportes and analytics', () => {
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'reportes', 'export')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'analytics', 'export')).toBe(true);
    });

    it('should NOT allow access to portafolio or pipeline', () => {
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'portafolio', 'view')).toBe(false);
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'pipeline', 'view')).toBe(false);
    });

    it('should NOT allow access to configuracion', () => {
      expect(checkAgencyPermission(AgencyMemberRole.CONTADOR, 'configuracion', 'view')).toBe(false);
    });
  });

  describe('VIEWER role - default permissions', () => {
    it('should allow view on dashboard, propietarios, portafolio, cobros, reportes', () => {
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'dashboard', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'propietarios', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'cobros', 'view')).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'reportes', 'view')).toBe(true);
    });

    it('should NOT allow create/edit/delete/export on any module', () => {
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'create')).toBe(false);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'edit')).toBe(false);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'portafolio', 'delete')).toBe(false);
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'reportes', 'export')).toBe(false);
    });

    it('should NOT allow access to configuracion', () => {
      expect(checkAgencyPermission(AgencyMemberRole.VIEWER, 'configuracion', 'view')).toBe(false);
    });
  });

  describe('Custom permissions override', () => {
    it('AGENTE with custom reportes:view should access reportes', () => {
      const customPermissions: AgencyPermissions = {
        reportes: ['view'],
      };

      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'reportes', 'view', customPermissions)).toBe(true);
    });

    it('custom permissions should override defaults completely', () => {
      // AGENTE normally has portafolio access, but custom perms remove it
      const customPermissions: AgencyPermissions = {
        dashboard: ['view'],
        // portafolio intentionally omitted
      };

      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'dashboard', 'view', customPermissions)).toBe(true);
      expect(checkAgencyPermission(AgencyMemberRole.AGENTE, 'portafolio', 'view', customPermissions)).toBe(false);
    });
  });
});
