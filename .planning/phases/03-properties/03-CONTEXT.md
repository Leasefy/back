# Phase 3: Properties - Context

**Gathered:** 2026-01-28
**Status:** Ready for planning

<domain>
## Phase Boundary

CRUD de propiedades para landlords y listado publico con filtros. Los landlords crean, editan y eliminan sus propiedades. Los tenants (y visitantes sin autenticar) pueden explorar y filtrar propiedades disponibles. Imagenes se almacenan en Supabase Storage.

**No incluye:** Aplicaciones a propiedades (Phase 4), scoring (Phase 5+), favoritos/guardados.

</domain>

<decisions>
## Implementation Decisions

### Estructura de Datos (Modelo Property)

**Alineacion con Frontend:** Usar nombres de campos del frontend para consistencia.

**Campos principales:**
- `id` (UUID)
- `landlordId` (UUID, FK a User)
- `title`, `description` (strings)
- `type`: enum `apartment | house | studio | room`
- `status`: enum `draft | available | rented | pending`

**Ubicacion:**
- `city`, `neighborhood`, `address` (strings)
- `latitude`, `longitude` (floats para mapa)

**Precios (COP enteros):**
- `monthlyRent`, `adminFee`, `deposit`

**Caracteristicas:**
- `bedrooms`, `bathrooms` (int)
- `area` (int, m2)
- `floor` (int, opcional)
- `parkingSpaces` (int)
- `stratum` (int, 1-6 colombiano)
- `yearBuilt` (int)

**Amenidades:**
- Array de strings con IDs predefinidos
- IDs validos: `pool`, `gym`, `security`, `parking`, `elevator`, `terrace`, `bbq`, `playground`, `laundry`, `pets`, `furnished`, `balcony`, `storage`, `ac`, `heating`

**Planes de publicacion:**
- `listingPlan`: enum `free | pro | business`

**Timestamps:**
- `createdAt`, `updatedAt`

### Imagenes y Storage

- **Maximo:** 10 imagenes por propiedad
- **Orden:** Campo `order` en cada imagen (0-9). Primera imagen es thumbnail.
- **Modelo separado:** `PropertyImage` con `id`, `propertyId`, `url`, `order`
- **Validacion:** Solo jpg/png/webp, maximo 5MB por imagen
- **Sin compresion:** Subir imagen tal cual (validar pero no procesar)
- **Storage:** Supabase Storage bucket `property-images`

### Filtros y Busqueda

**Filtros (alineados con frontend):**
- `city` (string)
- `minPrice`, `maxPrice` (int)
- `bedrooms` (int)
- `propertyType` (enum)
- `searchQuery` (string)

**Busqueda por texto:**
- PostgreSQL full-text search
- Campos indexados: title, description, address, neighborhood

### Paginacion

- Claude's discretion: elegir offset o cursor segun patron del frontend

### Permisos y Visibilidad

**Estados y visibilidad:**
- `draft`: Solo visible para el landlord dueno
- `available`, `rented`, `pending`: Visible publicamente

**Reglas de edicion:**
- Solo el landlord dueno puede editar/eliminar su propiedad
- **Bloqueo:** No se puede editar ni eliminar si hay aplicaciones activas (pendientes/en revision)

**Listado publico:**
- GET /properties: Publico, sin autenticacion
- Retorna solo propiedades con status != 'draft'

**Operaciones de landlord:**
- GET /properties/mine: Requiere auth, rol LANDLORD
- POST/PATCH/DELETE: Requiere auth, validar ownership

### Claude's Discretion

- Thumbnails: Decidir si generar version pequena o usar primera imagen original
- Paginacion: Offset-based vs cursor-based segun patron del frontend
- Indices de BD: Optimizar segun queries frecuentes
- Validacion de amenidades: Array de strings vs enum

</decisions>

<specifics>
## Specific Ideas

- Frontend tiene `PropertyAmenity[]` con objetos `{id, name, icon}` pero el backend solo necesita los IDs
- El frontend espera `thumbnailUrl` como campo separado - puede derivarse de `images[0].url`
- BACKEND-INTEGRATION.md documenta mismatches resueltos al usar nombres del frontend
- Coordenadas lat/lng necesarias para integracion con mapa interactivo (Phase 9 del frontend)

</specifics>

<deferred>
## Deferred Ideas

- Busqueda por amenidades multiples (filtro por amenidades) — considerar para iteracion futura
- Favoritos/propiedades guardadas — funcionalidad separada
- Propiedades destacadas/promocionadas — relacionado con planes de pago
- Historico de precios — tracking de cambios

</deferred>

---

*Phase: 03-properties*
*Context gathered: 2026-01-28*
