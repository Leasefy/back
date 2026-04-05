# Phase 24 Research: Granular Permissions & Team Role Enforcement

## Problem Statement

El backend tiene control de acceso a nivel de **tipo de usuario** (TENANT, LANDLORD, AGENT, ADMIN) y **membresía de agencia** (AgencyMemberGuard valida que el usuario sea miembro activo). Sin embargo, hay dos gaps de seguridad importantes:

1. **Inmobiliaria**: Los roles AGENTE, CONTADOR y VIEWER no se aplican. Un VIEWER puede hacer las mismas operaciones que un ADMIN en todos los módulos excepto en `agency.controller.ts` donde hay un `ensureAdmin()` manual.

2. **Equipo propietario**: Los roles admin, manager, accountant y viewer del TeamMember se guardan como string pero no se aplican en ningún guard. Un viewer puede eliminar propiedades.

---

## Estado Actual

### Guards existentes

| Guard | Qué hace | Dónde se usa |
|-------|----------|--------------|
| `SupabaseAuthGuard` | Valida JWT (global) | Todas las rutas |
| `RolesGuard` | Valida tipo de usuario (TENANT/LANDLORD/AGENT) | Global con `@Roles()` |
| `AgencyMemberGuard` | Valida membresía activa en agencia, inyecta `agencyId` + `agencyMemberRole` | 13 controllers de inmobiliaria |

### Qué inyecta AgencyMemberGuard en el request

```typescript
request.agencyId = member.agencyId;        // string
request.agencyMemberRole = member.role;     // AgencyMemberRole enum
```

### Enforcement actual de roles de agencia

Solo `agency.controller.ts` tiene enforcement parcial via `ensureAdmin()` (método privado):
- `PUT /inmobiliaria/agency` (update config) → ADMIN only
- `POST /inmobiliaria/agency/members` (invite) → ADMIN only
- `POST .../resend-invitation` → ADMIN only
- `PUT .../role` → ADMIN only
- `DELETE .../members/:id` → ADMIN only

Los otros 12 controllers (agentes, pipeline, propietarios, consignaciones, cobros, dispersiones, mantenimiento, renovaciones, documentos, actas, reports, analytics) **no tienen ningún chequeo de rol**.

### Enforcement actual de roles de equipo propietario

**Ninguno.** Los endpoints de propiedades, candidatos, contratos, visitas, leases usan solo `@Roles(Role.LANDLORD)` sin verificar si el usuario es el propietario real o un miembro de equipo, ni qué rol tiene.

---

## Análisis de Requisitos (del documento BACKEND-ROLES-PERMISSIONS.md)

### Inmobiliaria: 12 módulos × 5 acciones

```
Módulos: dashboard, propietarios, portafolio, pipeline, agentes,
         cobros, dispersiones, operaciones, reportes, configuracion,
         documentos, analytics

Acciones: view, create, edit, delete, export
```

Cada rol tiene defaults (ver sección 6 del doc), pero el admin puede personalizar permisos por usuario.

### Equipo propietario: 4 roles con matriz fija

```
Roles: admin, manager, accountant, viewer
Recursos: equipo, facturación, propiedades, candidatos, contratos,
          reportes, arriendos, visitas, mensajes, configuración
```

Los permisos de equipo de propietario **NO son personalizables** — son fijos por rol.

---

## Decisiones de Diseño

### 1. Permisos de inmobiliaria: JSON en AgencyMember vs tabla separada

**Opción A — Campo JSON en AgencyMember** (RECOMENDADA)
```prisma
model AgencyMember {
  // ... campos existentes ...
  permissions  Json?  // RolePermissions: { [module]: action[] }
}
```

Pros:
- Sin migración compleja, sin nueva tabla
- Una sola query para obtener miembro + permisos
- Consistente con otros campos JSON del schema (reminderConfig, branding, etc.)

Cons:
- No se puede hacer query directa por permiso

**Opción B — Tabla AgencyMemberPermission**
```prisma
model AgencyMemberPermission {
  id        String @id @default(uuid())
  memberId  String
  module    String
  actions   String[]
  member    AgencyMember @relation(...)
}
```

Pros: Consultable, indexable
Cons: JOIN extra en cada request, más complejidad

**Decisión**: Opción A. El volumen de datos es pequeño (12 módulos × 5 acciones máx = ~60 entradas) y siempre se consulta junto con el miembro.

### 2. Permisos de equipo propietario: Guard con matriz hardcodeada

Como los permisos son fijos por rol (no personalizables), no necesitan almacenarse en DB. Se define la matriz en código como constante y un guard la consulta.

### 3. Mapeo módulo → controller

| Módulo permiso | Controller actual | Ruta base |
|----------------|-------------------|-----------|
| dashboard | dashboard.controller.ts | `/inmobiliaria/dashboard` |
| propietarios | propietarios.controller.ts | `/inmobiliaria/propietarios` |
| portafolio | consignaciones.controller.ts | `/inmobiliaria/consignaciones` |
| pipeline | pipeline.controller.ts | `/inmobiliaria/pipeline` |
| agentes | agentes.controller.ts | `/inmobiliaria/agentes` |
| cobros | cobros.controller.ts | `/inmobiliaria/cobros` |
| dispersiones | dispersiones.controller.ts | `/inmobiliaria/dispersiones` |
| operaciones | mantenimiento.controller.ts | `/inmobiliaria/mantenimiento` |
| reportes | reports.controller.ts | `/inmobiliaria/reports` |
| configuracion | agency.controller.ts (parte) | `/inmobiliaria/agency` |
| documentos | documentos.controller.ts | `/inmobiliaria/documentos` |
| analytics | analytics.controller.ts | `/inmobiliaria/analytics` |

### 4. Mapeo HTTP method → acción

```
GET    → view
POST   → create
PUT/PATCH → edit
DELETE → delete
GET /export, GET /download → export
```

---

## Plan de Implementación (3 plans)

### Plan 24-01: Permisos granulares de inmobiliaria
- Migración Prisma: campo `permissions Json?` en AgencyMember
- Constante con defaults por rol (ADMIN, AGENTE, CONTADOR, VIEWER)
- Decorador `@RequirePermission(module, action)`
- Guard `AgencyPermissionGuard` que lee `agencyMemberRole` + `permissions`
- Si ADMIN → pass always
- Si permissions != null → usa permissions custom
- Si permissions == null → usa defaults del rol
- Endpoints GET/PUT permissions en agency.controller.ts
- Aplicar decorador en los 12 controllers

### Plan 24-02: Enforcement de roles de equipo propietario
- Constante `TEAM_ROLE_PERMISSIONS` con la matriz del doc
- Guard `TeamMemberGuard` que detecta si el usuario es owner o team member
- Si es owner → pass always
- Si es team member → consulta TeamMember, valida rol contra matriz
- Decorador `@RequireTeamRole(resource, action)`
- Aplicar en controllers de landlord: properties, candidates, contracts, leases, visits

### Plan 24-03: Tests de integración y endpoints de consulta
- Tests e2e para permisos de inmobiliaria (cada rol)
- Tests e2e para permisos de equipo propietario
- Endpoint GET /users/me/permissions que devuelve permisos efectivos del usuario actual
- Expiración automática de invitaciones (cron)
