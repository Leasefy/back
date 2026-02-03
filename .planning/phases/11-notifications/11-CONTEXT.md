# Phase 11: Notifications - Context & Decisions

## Overview

Sistema de notificaciones dual (email + push) para todos los eventos clave de la plataforma, con templates administrables por usuarios ADMIN.

## Decisions Made

### 1. Canales de Notificación

**Decisión**: Doble canal para TODAS las notificaciones
- **Push**: Firebase Cloud Messaging (FCM)
- **Email**: Resend

Cada evento envía ambos canales simultáneamente.

**Dependencias backend:**
```
firebase-admin
@react-email/components
resend
```

### 2. Eventos a Notificar (19 total)

#### Aplicaciones (4)
| Evento | Destinatario | Código |
|--------|--------------|--------|
| Nueva aplicación recibida | Landlord | `APPLICATION_RECEIVED` |
| Aplicación aprobada | Tenant | `APPLICATION_APPROVED` |
| Aplicación rechazada | Tenant | `APPLICATION_REJECTED` |
| Info adicional solicitada | Tenant | `APPLICATION_INFO_REQUESTED` |

#### Pagos (6)
| Evento | Destinatario | Código |
|--------|--------------|--------|
| Comprobante subido | Landlord | `PAYMENT_RECEIPT_UPLOADED` |
| Pago aprobado | Tenant | `PAYMENT_APPROVED` |
| Pago rechazado | Tenant | `PAYMENT_REJECTED` |
| Disputa abierta | Landlord + Soporte | `PAYMENT_DISPUTE_OPENED` |
| Recordatorio pago próximo | Tenant | `PAYMENT_REMINDER` |
| Pago atrasado | Landlord + Tenant | `PAYMENT_OVERDUE` |

#### Visitas (6)
| Evento | Destinatario | Código |
|--------|--------------|--------|
| Nueva solicitud de visita | Landlord | `VISIT_REQUESTED` |
| Visita aceptada | Tenant | `VISIT_ACCEPTED` |
| Visita rechazada | Tenant | `VISIT_REJECTED` |
| Visita cancelada | Otra parte | `VISIT_CANCELLED` |
| Visita reprogramada | Otra parte | `VISIT_RESCHEDULED` |
| Recordatorio 24h antes | Ambos | `VISIT_REMINDER_24H` |

#### Contratos (4)
| Evento | Destinatario | Código |
|--------|--------------|--------|
| Contrato listo para firmar | Tenant | `CONTRACT_READY_TO_SIGN` |
| Landlord firmó, falta tenant | Tenant | `CONTRACT_LANDLORD_SIGNED` |
| Tenant firmó, falta landlord | Landlord | `CONTRACT_TENANT_SIGNED` |
| Contrato completado | Ambos | `CONTRACT_COMPLETED` |

#### Leases (2)
| Evento | Destinatario | Código |
|--------|--------------|--------|
| Lease próximo a vencer (30 días) | Ambos | `LEASE_EXPIRING_SOON` |
| Lease vencido | Ambos | `LEASE_EXPIRED` |

**EXCLUIDO**: Score calculado (no notificar)

### 3. Preferencias de Usuario

**Decisión**: Básico - toggle global por canal

Campos en modelo User:
```prisma
emailNotificationsEnabled Boolean @default(true)
pushNotificationsEnabled  Boolean @default(true)
```

- Por defecto ambos activados
- Usuario puede desactivar email, push, o ambos globalmente

### 4. Sistema de Templates

**Decisión**: HTML con branding + CRUD administrativo + Markdown

#### Características:
- Templates editables en Markdown, convertidos a HTML al enviar
- CRUD de templates via endpoints protegidos (solo ADMIN)
- Templates separados para email y push
- Variables dinámicas reemplazadas al enviar

#### Variables disponibles:
| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{userName}}` | Nombre del destinatario | "Carlos Pérez" |
| `{{userEmail}}` | Email del destinatario | "carlos@email.com" |
| `{{propertyTitle}}` | Título de la propiedad | "Apartamento en Chapinero" |
| `{{propertyAddress}}` | Dirección | "Cra 7 #45-12" |
| `{{amount}}` | Monto (pagos) | "$1,500,000" |
| `{{date}}` | Fecha relevante | "15 de febrero, 2026" |
| `{{otherPartyName}}` | Nombre de la otra parte | "Juan López" |

#### Modelo NotificationTemplate:
```prisma
model NotificationTemplate {
  id          String   @id @default(uuid())
  code        String   @unique  // e.g., "APPLICATION_RECEIVED"
  name        String             // Human-readable name
  description String?            // Admin notes

  // Email template (Markdown)
  emailSubject  String
  emailBody     String  @db.Text  // Markdown content

  // Push template
  pushTitle     String
  pushBody      String

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 5. Rol de Administrador

**Decisión**: Agregar rol ADMIN al enum Role

```prisma
enum Role {
  TENANT
  LANDLORD
  BOTH
  ADMIN
}
```

- Endpoints de templates protegidos con guard `@Roles(Role.ADMIN)`
- Usuarios ADMIN no pueden ser TENANT o LANDLORD (rol exclusivo)

## Technical Architecture

### Módulos a crear:

1. **NotificationsModule**
   - `NotificationsService` - Orquestador principal
   - `EmailService` - Envío via Resend
   - `PushService` - Envío via FCM
   - `TemplateService` - Gestión y renderizado de templates

2. **NotificationTemplatesModule** (Admin)
   - CRUD endpoints para templates
   - Protegido con `@Roles(Role.ADMIN)`

### Flujo de envío:

```
Evento → NotificationsService.send(eventCode, userId, data)
       → TemplateService.render(template, data)
       → Check user preferences
       → EmailService.send() [si enabled]
       → PushService.send() [si enabled]
       → Log to NotificationLog table
```

### Cola BullMQ:

```typescript
// Queues
- notifications-email  // Async email sending
- notifications-push   // Async push sending
- notifications-scheduled // Reminders, overdue checks
```

### Modelo NotificationLog:

```prisma
model NotificationLog {
  id           String   @id @default(uuid())
  userId       String   @db.Uuid
  templateCode String
  channel      NotificationChannel  // EMAIL, PUSH
  status       NotificationStatus   // PENDING, SENT, FAILED
  errorMessage String?
  sentAt       DateTime?
  createdAt    DateTime @default(now())

  user         User     @relation(fields: [userId], references: [id])
}

enum NotificationChannel {
  EMAIL
  PUSH
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
}
```

## Environment Variables Required

```env
# Resend (Email)
RESEND_API_KEY=re_xxxxx

# Firebase (Push)
FIREBASE_PROJECT_ID=arriendo-facil
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@arriendo-facil.iam.gserviceaccount.com
```

## Success Criteria

1. ✅ Resend email service configurado
2. ✅ Firebase FCM configurado
3. ✅ 19 templates creados (email + push)
4. ✅ Templates editables via CRUD (solo ADMIN)
5. ✅ Variables dinámicas funcionando
6. ✅ Preferencias de usuario respetadas
7. ✅ Envío async via BullMQ
8. ✅ Logs de notificaciones
9. ✅ Rol ADMIN implementado

## Out of Scope

- Editor WYSIWYG visual (solo Markdown)
- Preferencias granulares por categoría
- Notificación de score calculado
- Attachments en emails
- Rich push notifications con imágenes

---
*Context gathered: 2026-02-03*
*Ready for planning phase*
