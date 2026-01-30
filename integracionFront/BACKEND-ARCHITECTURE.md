# Arquitectura del Backend - Arriendo Fácil

**Última actualización:** 2026-01-30
**Stack:** NestJS + Prisma + Supabase (PostgreSQL + Auth + Storage)

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estructura del Proyecto](#3-estructura-del-proyecto)
4. [Módulos y Responsabilidades](#4-módulos-y-responsabilidades)
5. [Base de Datos](#5-base-de-datos)
6. [Autenticación y Autorización](#6-autenticación-y-autorización)
7. [Storage (Supabase)](#7-storage-supabase)
8. [Patrones y Decisiones](#8-patrones-y-decisiones)
9. [Variables de Entorno](#9-variables-de-entorno)
10. [Comandos Útiles](#10-comandos-útiles)

---

## 1. Visión General

### 1.1 Propósito

Backend API REST para el marketplace de arriendos "Arriendo Fácil". Provee:

- APIs REST para gestión de usuarios, propiedades y aplicaciones
- Integración con Supabase Auth para autenticación
- Almacenamiento de imágenes y documentos en Supabase Storage
- Motor de Risk Score con análisis de documentos por IA (fases futuras)

### 1.2 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                     (Next.js / React)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTPS / JWT
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Backend                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Auth   │  │  Users  │  │Properties│ │ Applic- │        │
│  │ Module  │  │ Module  │  │  Module  │  │ ations  │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │            │            │            │              │
│       └────────────┴─────┬──────┴────────────┘              │
│                          │                                   │
│                   ┌──────▼──────┐                            │
│                   │   Prisma    │                            │
│                   │   Service   │                            │
│                   └──────┬──────┘                            │
└──────────────────────────┼──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Supabase │    │ Supabase │    │ Supabase │
    │   Auth   │    │PostgreSQL│    │ Storage  │
    └──────────┘    └──────────┘    └──────────┘
```

---

## 2. Stack Tecnológico

### 2.1 Core

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20+ | Runtime |
| NestJS | 11.x | Framework backend |
| TypeScript | 5.x | Lenguaje |
| Prisma | 7.x | ORM |

### 2.2 Supabase

| Servicio | Propósito |
|----------|-----------|
| PostgreSQL | Base de datos relacional |
| Auth | Autenticación OAuth (Google) |
| Storage | Almacenamiento de archivos |

### 2.3 Librerías Principales

| Librería | Propósito |
|----------|-----------|
| @nestjs/passport | Autenticación |
| passport-jwt | Validación JWT |
| jwks-rsa | Obtener JWKS de Supabase |
| class-validator | Validación de DTOs |
| class-transformer | Transformación de datos |
| @supabase/supabase-js | Cliente Supabase |
| file-type | Validación MIME por magic numbers |

---

## 3. Estructura del Proyecto

```
src/
├── app.module.ts              # Módulo raíz
├── main.ts                    # Entry point
│
├── common/                    # Código compartido
│   ├── decorators/
│   │   ├── public.decorator.ts      # @Public() para rutas públicas
│   │   ├── roles.decorator.ts       # @Roles(Role.LANDLORD)
│   │   └── current-user.decorator.ts # @CurrentUser()
│   ├── enums/
│   │   ├── role.enum.ts
│   │   ├── property-type.enum.ts
│   │   ├── property-status.enum.ts
│   │   ├── application-status.enum.ts
│   │   ├── application-event-type.enum.ts
│   │   ├── document-type.enum.ts
│   │   └── subscription-plan.enum.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts  # Manejo global de errores
│   └── guards/
│       ├── jwt-auth.guard.ts         # Validación JWT
│       └── roles.guard.ts            # Validación de roles
│
├── config/                    # Configuración
│   └── env.validation.ts      # Validación de .env
│
├── prisma/                    # Servicio Prisma
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── auth/                      # Módulo de autenticación
│   ├── auth.module.ts
│   ├── jwt.strategy.ts        # Estrategia Passport JWT
│   └── types/
│       └── jwt-payload.interface.ts
│
├── users/                     # Módulo de usuarios
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── dto/
│       ├── update-user.dto.ts
│       └── complete-onboarding.dto.ts
│
├── properties/                # Módulo de propiedades
│   ├── properties.module.ts
│   ├── properties.controller.ts
│   ├── properties.service.ts
│   └── dto/
│       ├── create-property.dto.ts
│       ├── update-property.dto.ts
│       └── filter-properties.dto.ts
│
├── applications/              # Módulo de aplicaciones
│   ├── applications.module.ts
│   ├── applications.controller.ts
│   ├── applications.service.ts
│   ├── dto/
│   │   ├── create-application.dto.ts
│   │   ├── personal-info.dto.ts
│   │   ├── employment-info.dto.ts
│   │   ├── income-info.dto.ts
│   │   ├── references.dto.ts
│   │   ├── submit-application.dto.ts
│   │   └── withdraw-application.dto.ts
│   ├── state-machine/
│   │   └── application-state-machine.ts
│   └── events/
│       └── application-event.service.ts
│
├── documents/                 # Módulo de documentos
│   ├── documents.module.ts
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── dto/
│       └── upload-document.dto.ts
│
└── health/                    # Health check
    ├── health.module.ts
    └── health.controller.ts

prisma/
└── schema.prisma              # Schema de base de datos

supabase/
└── migrations/
    └── 00001_user_sync_trigger.sql  # Trigger para sincronizar usuarios
```

---

## 4. Módulos y Responsabilidades

### 4.1 AuthModule

**Responsabilidad:** Autenticación con Supabase JWT

- Valida tokens JWT usando JWKS de Supabase
- Extrae información del usuario del token
- No maneja registro/login (eso lo hace Supabase directamente)

**Archivos clave:**
- `jwt.strategy.ts`: Estrategia Passport que valida JWT contra JWKS

### 4.2 UsersModule

**Responsabilidad:** Gestión de perfiles de usuario

- CRUD de perfil de usuario
- Onboarding post-OAuth
- Cambio de rol activo (para usuarios BOTH)

**Endpoints:**
- `GET /users/me` - Obtener perfil
- `PATCH /users/me` - Actualizar perfil
- `POST /users/me/onboarding` - Completar onboarding
- `PATCH /users/me/role` - Cambiar rol activo

### 4.3 PropertiesModule

**Responsabilidad:** Gestión de propiedades inmobiliarias

- CRUD de propiedades (landlords)
- Listado público con filtros
- Gestión de imágenes (Supabase Storage)
- Validación de amenidades

**Endpoints:**
- `GET /properties` - Listar públicas
- `GET /properties/mine` - Mis propiedades
- `POST /properties` - Crear
- `PATCH /properties/:id` - Actualizar
- `DELETE /properties/:id` - Eliminar
- `POST /properties/:id/images` - Subir imagen
- `DELETE /properties/:id/images/:imageId` - Eliminar imagen

### 4.4 ApplicationsModule

**Responsabilidad:** Gestión de aplicaciones de arriendo

- Wizard de 6 pasos para aplicaciones
- Máquina de estados para validar transiciones
- Logging de eventos para auditoría
- Gestión del ciclo de vida (submit, withdraw, etc.)

**Sub-componentes:**
- `ApplicationStateMachine`: Valida transiciones de estado
- `ApplicationEventService`: Logging de eventos

**Endpoints:**
- `POST /applications` - Crear aplicación
- `GET /applications/mine` - Mis aplicaciones
- `PATCH /applications/:id/steps/1-4` - Wizard steps
- `POST /applications/:id/submit` - Enviar
- `POST /applications/:id/withdraw` - Retirar
- `GET /applications/:id/timeline` - Ver eventos

### 4.5 DocumentsModule

**Responsabilidad:** Gestión de documentos de aplicación

- Upload a Supabase Storage (bucket privado)
- Validación MIME por magic numbers
- URLs firmadas con expiración

**Endpoints:**
- `POST /documents/upload` - Subir documento
- `GET /documents/application/:id` - Listar documentos
- `GET /documents/:id/url` - Obtener URL firmada
- `DELETE /documents/:id` - Eliminar

---

## 5. Base de Datos

### 5.1 Diagrama ER

```
┌─────────────┐       ┌──────────────┐       ┌─────────────────┐
│    User     │       │   Property   │       │   Application   │
├─────────────┤       ├──────────────┤       ├─────────────────┤
│ id (UUID)   │◀──┐   │ id (UUID)    │◀──────│ id (UUID)       │
│ email       │   │   │ landlordId   │───┐   │ propertyId      │
│ role        │   │   │ title        │   │   │ tenantId        │
│ activeRole  │   │   │ description  │   │   │ status          │
│ firstName   │   │   │ type         │   │   │ currentStep     │
│ lastName    │   │   │ status       │   │   │ personalInfo    │
│ phone       │   │   │ city         │   │   │ employmentInfo  │
│ subscription│   │   │ neighborhood │   │   │ incomeInfo      │
│ Plan        │   │   │ address      │   │   │ referencesInfo  │
│ createdAt   │   │   │ monthlyRent  │   │   │ submittedAt     │
│ updatedAt   │   │   │ bedrooms     │   │   │ createdAt       │
└─────────────┘   │   │ bathrooms    │   │   │ updatedAt       │
                  │   │ area         │   │   └────────┬────────┘
                  │   │ amenities[]  │   │            │
                  │   │ createdAt    │   │            │
                  │   │ updatedAt    │   │            │
                  │   └──────┬───────┘   │            │
                  │          │           │            │
                  │          ▼           │            │
                  │   ┌──────────────┐   │            ▼
                  │   │PropertyImage │   │   ┌─────────────────┐
                  │   ├──────────────┤   │   │ApplicationDoc   │
                  │   │ id           │   │   ├─────────────────┤
                  │   │ propertyId   │   │   │ id              │
                  │   │ url          │   │   │ applicationId   │
                  │   │ order        │   │   │ type            │
                  │   │ createdAt    │   │   │ storagePath     │
                  │   └──────────────┘   │   │ originalName    │
                  │                      │   │ mimeType        │
                  │                      │   │ size            │
                  └──────────────────────┘   │ createdAt       │
                                             └────────┬────────┘
                                                      │
                                                      │
                                             ┌────────▼────────┐
                                             │ApplicationEvent │
                                             ├─────────────────┤
                                             │ id              │
                                             │ applicationId   │
                                             │ type            │
                                             │ actorId         │
                                             │ metadata        │
                                             │ createdAt       │
                                             └─────────────────┘
```

### 5.2 Enums de Base de Datos

```sql
-- Roles de usuario
enum Role { TENANT, LANDLORD, BOTH }

-- Tipo de propiedad
enum PropertyType { APARTMENT, HOUSE, STUDIO, ROOM }

-- Estado de propiedad
enum PropertyStatus { DRAFT, AVAILABLE, RENTED, PENDING }

-- Estado de aplicación
enum ApplicationStatus {
  DRAFT, SUBMITTED, UNDER_REVIEW, NEEDS_INFO,
  PREAPPROVED, APPROVED, REJECTED, WITHDRAWN
}

-- Tipo de evento de aplicación
enum ApplicationEventType {
  CREATED, STEP_COMPLETED, SUBMITTED, STATUS_CHANGED,
  INFO_REQUESTED, INFO_PROVIDED, DOCUMENT_UPLOADED,
  DOCUMENT_DELETED, WITHDRAWN
}

-- Tipo de documento
enum DocumentType {
  CEDULA, EMPLOYMENT_LETTER, PAY_STUB, BANK_STATEMENT, OTHER
}

-- Plan de suscripción
enum SubscriptionPlan { FREE, PRO, BUSINESS }
```

### 5.3 Índices

```prisma
// Property
@@index([landlordId])
@@index([city])
@@index([status])
@@index([monthlyRent])
@@index([bedrooms])
@@index([type])

// Application
@@index([propertyId])
@@index([tenantId])
@@index([status])

// ApplicationDocument
@@index([applicationId])

// ApplicationEvent
@@index([applicationId])
@@index([type])
```

---

## 6. Autenticación y Autorización

### 6.1 Flujo de Autenticación

```
1. Usuario hace login/registro en Supabase Auth (OAuth Google)
2. Supabase genera JWT firmado con JWKS
3. Frontend envía JWT en header: Authorization: Bearer <token>
4. Backend valida JWT usando JWKS público de Supabase
5. Si válido, extrae user_id del token y busca en BD local
6. Usuario disponible en request para el controlador
```

### 6.2 Guards

**JwtAuthGuard (global)**
- Aplicado a todas las rutas por defecto
- Valida JWT con Supabase JWKS
- Se puede bypassear con @Public()

**RolesGuard (global)**
- Verifica rol del usuario contra @Roles() decorator
- BOTH tiene acceso a rutas de TENANT y LANDLORD

### 6.3 Decoradores

```typescript
// Ruta pública (sin auth)
@Public()
@Get()
findAll() {}

// Requiere rol específico
@Roles(Role.LANDLORD)
@Post()
create() {}

// Obtener usuario actual
@Get('me')
getProfile(@CurrentUser() user: User) {}
```

---

## 7. Storage (Supabase)

### 7.1 Buckets

| Bucket | Público | Contenido |
|--------|---------|-----------|
| `property-images` | Sí | Fotos de propiedades |
| `application-documents` | No | Documentos sensibles (cédulas, etc.) |

### 7.2 Estructura de Archivos

```
property-images/
└── {propertyId}/
    ├── 1234567890-abc123.jpg  # timestamp-random.ext
    ├── 1234567891-def456.jpg
    └── ...

application-documents/
└── {applicationId}/
    ├── 1234567890-cedula.pdf
    ├── 1234567891-carta.pdf
    └── ...
```

### 7.3 URLs

**Imágenes de propiedades (públicas):**
```
https://{project}.supabase.co/storage/v1/object/public/property-images/{path}
```

**Documentos de aplicación (firmadas):**
```
https://{project}.supabase.co/storage/v1/object/sign/application-documents/{path}?token=...
```
- Expiran en 1 hora
- Se generan bajo demanda con `GET /documents/:id/url`

### 7.4 Validación de Archivos

```typescript
// Imágenes permitidas
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Documentos permitidos
const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB

// Validación por magic numbers (no por extensión)
import { fileTypeFromBuffer } from 'file-type';
const detected = await fileTypeFromBuffer(buffer);
```

---

## 8. Patrones y Decisiones

### 8.1 Decisiones Arquitectónicas

| Decisión | Razón |
|----------|-------|
| NestJS 11.x | Última versión estable, TypeScript nativo |
| Prisma 7.x con adapter | Requiere adapter para PostgreSQL directo |
| JWKS para JWT | Rotación automática de keys, más seguro |
| Guards globales | Seguro por defecto, opt-out con @Public() |
| JSON fields para wizard | Flexibilidad en schema, validación en app |
| Custom state machine | XState overkill para flujo lineal simple |
| Magic number validation | Extensiones pueden ser falsificadas |
| Signed URLs para docs | Documentos sensibles no deben ser públicos |

### 8.2 Patrones Utilizados

**Repository Pattern (via Prisma)**
```typescript
// Prisma Service actúa como repository
this.prisma.property.findMany({ where: {...} })
```

**DTO Validation Pattern**
```typescript
// class-validator + class-transformer
@IsString()
@MinLength(5)
title!: string;
```

**Guard Pattern**
```typescript
// Guards encadenados: Auth -> Roles
@UseGuards(JwtAuthGuard, RolesGuard)
```

**State Machine Pattern**
```typescript
// Transiciones explícitas
const VALID_TRANSITIONS = {
  [Status.DRAFT]: [Status.SUBMITTED, Status.WITHDRAWN],
  [Status.SUBMITTED]: [Status.UNDER_REVIEW],
  // ...
};
```

**Event Sourcing Lite**
```typescript
// Logging de eventos para auditoría
await this.eventService.logStatusChanged(appId, oldStatus, newStatus, userId);
```

---

## 9. Variables de Entorno

```env
# Servidor
PORT=3000
NODE_ENV=development

# Base de datos
DATABASE_URL=postgresql://...?pgbouncer=true
DIRECT_URL=postgresql://...  # Sin pooler, para migrations

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...     # Clave pública
SUPABASE_SERVICE_KEY=eyJ...  # Clave privada (server-side)
SUPABASE_JWT_SECRET=xxx      # Para verificación local (opcional)
```

### 9.1 Obtener Credenciales de Supabase

1. **Dashboard** → **Settings** → **API**
2. **Project URL** → `SUPABASE_URL`
3. **anon public** → `SUPABASE_ANON_KEY`
4. **service_role secret** → `SUPABASE_SERVICE_KEY`
5. **JWT Secret** → `SUPABASE_JWT_SECRET`

---

## 10. Comandos Útiles

### 10.1 Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo (hot reload)
npm run start:dev

# Build para producción
npm run build

# Iniciar en producción
npm run start:prod
```

### 10.2 Prisma

```bash
# Generar cliente después de cambios en schema
npx prisma generate

# Sincronizar schema con BD (desarrollo)
npx prisma db push

# Crear migración (producción)
npx prisma migrate dev --name nombre_migracion

# Abrir Prisma Studio (GUI para BD)
npx prisma studio

# Ver schema actual de la BD
npx prisma db pull
```

### 10.3 Testing

```bash
# Ejecutar tests unitarios
npm run test

# Tests con coverage
npm run test:cov

# Tests e2e
npm run test:e2e
```

### 10.4 Linting

```bash
# Ejecutar ESLint
npm run lint

# Formatear código
npm run format
```

---

## Anexos

### A. Fases del Proyecto

| Fase | Nombre | Estado |
|------|--------|--------|
| 1 | Foundation | ✅ Completa |
| 2 | Auth & Users | ✅ Completa |
| 3 | Properties | ✅ Completa |
| 4 | Applications & Documents | ✅ Completa |
| 5 | Scoring Engine | Pendiente |
| 6 | AI Document Analysis | Pendiente |
| 7 | Explainability | Pendiente |
| 8 | Landlord Features | Pendiente |
| 9 | Notifications | Pendiente |
| 10 | ML Persistence | Pendiente |
| 11 | Subscriptions & Plans | Pendiente |
| 12 | Contracts | Pendiente |
| 13 | Leases & Payments | Pendiente |
| 14 | Insurance | Pendiente |

### B. Límites de Plan

```typescript
const PLAN_LIMITS = {
  FREE: {
    maxProperties: 1,
    maxContracts: 1,
    aiScoring: false,
    apiAccess: false,
  },
  PRO: {
    maxProperties: 10,
    maxContracts: Infinity,
    aiScoring: true,
    apiAccess: false,
  },
  BUSINESS: {
    maxProperties: Infinity,
    maxContracts: Infinity,
    aiScoring: true,
    apiAccess: true,
  },
};
```

### C. Referencias

- [NestJS Documentation](https://docs.nestjs.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- `.planning/` - Documentación de planificación del proyecto
