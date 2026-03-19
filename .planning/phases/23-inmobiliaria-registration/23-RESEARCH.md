# Phase 23 Research: Inmobiliaria Registration & Onboarding Flow

## Problem Statement

El backend ya tiene la infraestructura completa de agencias (Phase 2.2) con endpoints de gestión de miembros, configuración y todas las entidades. Sin embargo, **el flujo de registro e incorporación de inmobiliarias como nuevos usuarios está desconectado y es incompleto**. Los gaps críticos son:

1. El endpoint `POST /users/me/onboarding` solo acepta `TENANT`, `LANDLORD`, `AGENT` — sin tipo `INMOBILIARIA`
2. No existe un flujo conectado entre el registro de usuario y la creación de agencia
3. Los miembros invitados quedan en estado `INVITED` permanentemente — no hay endpoint para aceptar/rechazar invitaciones
4. No hay middleware que verifique si un usuario de agencia completó su onboarding

---

## Estado Actual del Backend

### Lo que YA existe (Phase 2.2)

| Endpoint | Estado |
|----------|--------|
| `POST /inmobiliaria/agency` | ✅ Crear agencia (cualquier usuario autenticado) |
| `GET /inmobiliaria/agency` | ✅ Obtener agencia del usuario actual |
| `PUT /inmobiliaria/agency` | ✅ Actualizar configuración (solo ADMIN) |
| `POST /inmobiliaria/agency/members` | ✅ Invitar miembro por email |
| `GET /inmobiliaria/agency/members` | ✅ Listar miembros |
| `PUT /inmobiliaria/agency/members/:id/role` | ✅ Cambiar rol |
| `DELETE /inmobiliaria/agency/members/:id` | ✅ Eliminar miembro |
| `GET /inmobiliaria/agency/integrations` | ✅ Listar integraciones |
| `PUT /inmobiliaria/agency/integrations/:id` | ✅ Toggle integración |

### Lo que FALTA (Phase 23)

| Gap | Descripción |
|-----|-------------|
| Onboarding INMOBILIARIA | `userType: 'INMOBILIARIA'` no soportado en `/users/me/onboarding` |
| Registro combinado | No existe un endpoint que haga registro + creación de agencia en un solo paso |
| Aceptar invitación | `POST /inmobiliaria/agency/members/:id/accept` no existe |
| Rechazar invitación | `POST /inmobiliaria/agency/members/:id/decline` no existe |
| Invitación por token | No hay sistema de tokens para invitaciones (actualmente requiere que el usuario ya exista) |
| Estado de onboarding | No hay forma de saber si un admin de agencia completó el setup de la agencia |

---

## Flujo Actual vs Flujo Deseado

### Flujo Actual (roto)
```
1. Usuario hace OAuth con Supabase
2. POST /users/me/onboarding { userType: 'LANDLORD' }   ← no hay opción INMOBILIARIA
3. POST /inmobiliaria/agency { name, nit... }             ← paso separado, desconectado
4. POST /inmobiliaria/agency/members { email }            ← invitado queda en INVITED forever
5. Invitado... ¿qué hace? No hay endpoint para aceptar
```

### Flujo Deseado (Phase 23)
```
ADMIN:
1. OAuth con Supabase
2. POST /users/me/onboarding { userType: 'INMOBILIARIA', agency: { name, nit... } }
   → Crea usuario + crea agencia + añade como ADMIN en un atomic step
   → Devuelve { user, agency, nextStep: 'complete_agency_profile' }
3. (Opcional) PUT /inmobiliaria/agency { address, city, logo... }
4. POST /inmobiliaria/agency/members { email, role }  → genera token de invitación
5. GET /inmobiliaria/agency/onboarding-status  → checklist de setup

MIEMBRO INVITADO:
1. Recibe email con link de invitación que contiene token
2. Hace OAuth / registro en Supabase
3. POST /inmobiliaria/agency/invitations/:token/accept
   → Valida token, une usuario a agencia, status INVITED → ACTIVE
   → Completa onboarding del usuario automáticamente
4. Accede al panel de la agencia
```

---

## Análisis de Archivos Relevantes

### `src/users/users.controller.ts`
- Línea ~186: `POST /users/me/onboarding` con `CompleteOnboardingDto`
- Acepta: `TENANT | LANDLORD | AGENT` — **necesita agregar `INMOBILIARIA`**

### `src/users/dto/complete-onboarding.dto.ts`
- Enum de `userType` — **necesita actualización**

### `src/inmobiliaria/agency/agency.service.ts`
- `createAgency()` — crea agencia y añade creator como ADMIN
- `inviteMember()` — busca usuario por email y crea AgencyMember con status INVITED
- **Falta:** método para generar token de invitación
- **Falta:** método para aceptar invitación por token

### `src/inmobiliaria/agency/agency.controller.ts`
- 9 endpoints actuales
- **Falta:** endpoints de accept/decline invitación

### `prisma/schema.prisma`
- `AgencyMember` model: tiene `status: AgencyMemberStatus`
- `AgencyMemberStatus`: ACTIVE, INVITED, INACTIVE
- **Falta:** campo `invitationToken`, `invitationExpiresAt` en AgencyMember

---

## Decisiones de Diseño

### 1. Onboarding Unificado vs Separado

**Opción A:** Agregar `INMOBILIARIA` al onboarding existente + campo opcional `agency`
```typescript
POST /users/me/onboarding
{
  userType: 'INMOBILIARIA',
  firstName: 'Juan',
  lastName: 'Pérez',
  agency: { name: 'Inmobiliaria XYZ', nit: '900.123.456-7', city: 'Bogotá' }
}
```
**Pro:** Un solo request, atómico. **Con:** El DTO se vuelve más complejo.

**Opción B:** Onboarding en 2 steps
```typescript
// Step 1
POST /users/me/onboarding { userType: 'INMOBILIARIA' }
// Step 2 (ya existente)
POST /inmobiliaria/agency { name, nit... }
```
**Pro:** Separación de concerns. **Con:** El frontend tiene que manejar estado entre dos requests.

**Decisión:** Opción A — el frontend necesita un flujo fluido. El DTO tiene validación condicional.

### 2. Sistema de Tokens de Invitación

Actualmente las invitaciones requieren que el usuario ya exista en la plataforma. Esto es restrictivo — debería poder invitar a alguien que aún no está registrado.

**Solución:** Agregar `invitationToken` (UUID) e `invitationExpiresAt` al modelo `AgencyMember`. El token se envía por email (Resend) y es válido por 7 días.

### 3. Aceptar Invitación sin Auth previa

Un invitado recibe el email, hace clic en el link, y necesita registrarse. El flujo:
1. `GET /inmobiliaria/agency/invitations/:token` → valida token y devuelve agencia info (público)
2. Usuario hace OAuth
3. `POST /inmobiliaria/agency/invitations/:token/accept` → une usuario a agencia

El endpoint de aceptar requiere auth (ya hizo OAuth) pero el GET de info del token es público.

---

## Nuevos Campos en Prisma

```prisma
model AgencyMember {
  // ... campos existentes ...
  invitationToken     String?   @unique
  invitationExpiresAt DateTime?
  invitedEmail        String?   // Para invitaciones a usuarios que no existen aún
}
```

---

## Nuevos Endpoints a Implementar

| # | Método | Ruta | Descripción | Auth |
|---|--------|------|-------------|------|
| 1 | `POST` | `/users/me/onboarding` (update) | Soporte `userType: INMOBILIARIA` + campo `agency` | Requerida |
| 2 | `GET` | `/inmobiliaria/agency/onboarding-status` | Checklist de setup completado | Requerida (ADMIN) |
| 3 | `GET` | `/inmobiliaria/agency/invitations/:token` | Info de invitación por token | Pública |
| 4 | `POST` | `/inmobiliaria/agency/invitations/:token/accept` | Aceptar invitación | Requerida |
| 5 | `POST` | `/inmobiliaria/agency/invitations/:token/decline` | Rechazar invitación | Opcional (link en email) |
| 6 | `POST` | `/inmobiliaria/agency/members/:id/resend-invitation` | Reenviar email de invitación | Requerida (ADMIN) |

---

## Impacto en Módulos Existentes

| Módulo | Cambio |
|--------|--------|
| `UsersModule` | Actualizar `CompleteOnboardingDto` + lógica de onboarding |
| `AgencyModule` | Agregar 4 endpoints nuevos + lógica de tokens |
| `NotificationsModule` | Agregar evento/email de invitación con token |
| `PrismaSchema` | Agregar `invitationToken`, `invitationExpiresAt`, `invitedEmail` a `AgencyMember` |
| `AuthModule` | Verificar no hay conflictos con guards existentes |

---

## Estimado de Complejidad

- **Planes:** 3
- **Nuevos endpoints:** 6 (1 update + 5 nuevos)
- **Cambios en Prisma:** 1 migración (3 campos)
- **Servicios modificados:** 2 (UsersService, AgencyService)
- **Servicios nuevos:** Lógica de tokens en AgencyService
- **Emails:** 1 nuevo template (invitation email con token)
