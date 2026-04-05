# Actualizaciones Backend — 2026-04-05

**Para:** Frontend AI / equipo frontend
**Desde:** Backend

Estos son los endpoints nuevos y mejoras agregadas desde la ultima ronda. Todo esta aplicado en la DB y listo para consumir.

---

## 1. Avatar Upload (NUEVO)

Endpoint para subir avatar del usuario con compresion automatica.

### Endpoint

```
POST /users/me/avatar
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

### Body

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `file` | File (binary) | Imagen JPG, PNG o WebP. Max 10 MB raw |

### Response 200

```json
{
  "url": "https://xxx.supabase.co/storage/v1/object/public/user-avatars/{userId}/{timestamp}.webp"
}
```

### Comportamiento

- La imagen se **comprime automaticamente** a 512x512 WebP (calidad 82)
- Tamano final tipico: 20-40 KB
- Auto-rotacion EXIF (si la foto viene rotada del celular)
- Si el usuario ya tenia avatar, se **borra el anterior** del bucket automaticamente
- El `avatarUrl` del usuario se actualiza en el perfil — el `PATCH /users/me` sigue funcionando para otros campos

### Errores

| Status | Causa |
|--------|-------|
| 400 | No se envio archivo, mime invalido, o imagen > 10 MB |
| 400 | Error al procesar la imagen (archivo corrupto) |

### Ejemplo de uso (fetch)

```typescript
async function uploadAvatar(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/users/me/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) throw new Error('Upload failed');
  const { url } = await res.json();
  return url;
}
```

**Nota:** No uses `Content-Type: application/json` en este request. El navegador setea el boundary automaticamente cuando usas FormData.

---

## 2. Campo `position` en Miembros de Agencia (NUEVO)

Campo de titulo/cargo libre para mostrar en la UI, independiente del rol del sistema (ej: "Administrador General", "Agente Senior", "Contadora Principal").

### 2a. Al invitar un miembro

El endpoint existente ahora acepta `position` opcional:

```
POST /inmobiliaria/agency/members
```

**Body actualizado:**

```json
{
  "email": "agente@ejemplo.com",
  "name": "Carlos Ramirez",
  "role": "AGENTE",
  "position": "Agente Senior"
}
```

El campo `position` es **opcional** y maximo 100 caracteres.

### 2b. Actualizar el `position` de un miembro existente (NUEVO endpoint)

```
PATCH /inmobiliaria/agency/members/:memberId/profile
Content-Type: application/json
Authorization: Bearer {token}
Header: x-agency-id: {agencyId}
```

**Solo admins de la agencia pueden llamar este endpoint.**

**Body:**

```json
{
  "position": "Administrador General"
}
```

**Response 200:** Retorna el `AgencyMember` actualizado con el nuevo `position`.

### 2c. Respuesta de listar miembros

`GET /inmobiliaria/agency/members` ahora incluye `position` en cada miembro:

```json
[
  {
    "id": "uuid",
    "agencyId": "uuid",
    "userId": "uuid",
    "role": "ADMIN",
    "position": "Administrador General",
    "status": "ACTIVE",
    ...
  }
]
```

El campo es `string | null` — si el miembro nunca se lo seteo, viene null.

---

## 3. Reports Enrichment (MEJORAS A ENDPOINTS EXISTENTES)

Los 3 endpoints de reports ahora devuelven campos adicionales que el front necesitaba para los componentes avanzados.

### 3a. `GET /inmobiliaria/reports/cartera` — nuevo `byMonth[]`

Breakdown mensual de cobrado vs pendiente (ultimos 12 meses).

**Response actualizado:**

```json
{
  "items": [...],
  "summary": {
    "totalPending": 4500000,
    "bucket0to30": 3000000,
    "bucket31to60": 1000000,
    "bucket61to90": 500000,
    "bucket90plus": 0
  },
  "byMonth": [
    {
      "month": "2025-05",
      "collected": 12500000,
      "overdue": 500000,
      "total": 13000000,
      "cobroCount": 10,
      "collectionRate": 96.15
    },
    { "month": "2025-06", ... },
    ...
  ]
}
```

| Campo | Descripcion |
|-------|-------------|
| `collected` | Total pagado en ese mes (COP) |
| `overdue` | Total pendiente de cobros late/partial de ese mes (COP) |
| `total` | Total facturado ese mes (COP) |
| `cobroCount` | Cantidad de cobros generados en ese mes |
| `collectionRate` | Porcentaje cobrado (collected / total * 100) |

Ordenado del mes mas antiguo al mas reciente.

### 3b. `GET /inmobiliaria/reports/ocupacion` — nuevos `byProperty[]` y `monthlyTrend[]`

**Response actualizado:**

```json
{
  "totalProperties": 48,
  "totalOccupied": 41,
  "overallOccupancyRate": 85.42,
  "zones": [...],
  "byProperty": [
    {
      "consignacionId": "uuid",
      "propertyTitle": "Apartamento Centro 301",
      "propertyAddress": "Calle 123 #45-67",
      "propertyCity": "Bogota",
      "propertyZone": "Chapinero",
      "propertyType": "APARTMENT",
      "monthlyRent": 1500000,
      "availability": "RENTED",
      "tenantName": "Juan Perez",
      "leaseEndDate": "2026-12-31"
    }
  ],
  "monthlyTrend": [
    {
      "month": "2025-05",
      "occupied": 38,
      "total": 48,
      "rate": 79.17
    }
  ]
}
```

| Campo nuevo | Descripcion |
|-------------|-------------|
| `byProperty[]` | Lista completa de propiedades con su disponibilidad, tenant, y fecha de fin de contrato |
| `monthlyTrend[]` | Ocupacion mes a mes (ultimos 12 meses). Se deriva de los cobros generados (si hay cobro, estaba ocupada) |

### 3c. `GET /inmobiliaria/reports/rendimiento-agentes` — nuevos campos por agente

**Response actualizado:**

```json
{
  "period": "2026-04",
  "agentes": [
    {
      "userId": "uuid",
      "assignedConsignaciones": 15,
      "activePipeline": 8,
      "activeLeads": 8,
      "completedDeals": 3,
      "lostDeals": 1,
      "conversionRate": 75.0,
      "avgDaysToClose": 22
    }
  ]
}
```

| Campo nuevo | Descripcion |
|-------------|-------------|
| `activeLeads` | Alias de `activePipeline` (items no cerrados ni perdidos) |
| `lostDeals` | Deals perdidos este mes |
| `conversionRate` | `completed / (completed + lost) * 100` del mes |

El campo `avgDaysToClose` ya existia, solo que el front no lo estaba usando — es el promedio de dias desde que se creo el pipeline item hasta que se cerro.

---

## Resumen de tareas para el front

| # | Accion | Prioridad |
|---|--------|-----------|
| 1 | Implementar upload de avatar usando `POST /users/me/avatar` con FormData | Media |
| 2 | Agregar campo `position` al form de invitar miembro | Baja |
| 3 | Agregar UI para editar `position` de miembro existente (`PATCH .../members/:id/profile`) | Baja |
| 4 | Mostrar `position` en la tabla/cards de miembros (cuando exista) | Baja |
| 5 | Reemplazar arrays vacios en los adapters de reports con los nuevos campos: `byMonth`, `byProperty`, `monthlyTrend`, `activeLeads`, `lostDeals`, `conversionRate` | Media |

---

## Notas importantes

- **Avatar bucket:** Ya creado en Supabase (`user-avatars`). El endpoint funciona out of the box.
- **DB:** Todas las migraciones aplicadas (12/12). Plan configs con `evaluationCreditPrice` cargados.
- **Compresion:** El avatar se comprime en el backend automaticamente. El front no necesita comprimir antes de subir — puede mandar el archivo original del usuario (hasta 10MB).
- **Formato:** El backend convierte TODO a WebP. Si la UI necesita mostrar el avatar, solo usa la URL que retorna el endpoint — ya es WebP y los navegadores modernos lo soportan.

---

*Generado: 2026-04-05*
