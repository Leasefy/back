# Avatar Upload — Configuracion y Funcionamiento

**Fecha:** 2026-04-05
**Estado:** Implementado

## Endpoint

```
POST /users/me/avatar
Content-Type: multipart/form-data
Auth: Bearer token
Body: { file: <binary> }
```

**Response:**
```json
{ "url": "https://xxx.supabase.co/storage/v1/object/public/user-avatars/..." }
```

## Compresion automatica

Toda imagen subida pasa por `sharp` antes de llegar a storage:

| Paso | Operacion |
|------|-----------|
| 1 | Auto-rotar segun EXIF |
| 2 | Resize a **512x512 px** (fit: cover, position: center) |
| 3 | Convertir a **WebP** |
| 4 | Calidad **82** |

**Resultado esperado:** Archivos de 20-40 KB (vs 2-5 MB originales).

## Validaciones

| Regla | Valor |
|-------|-------|
| Mime types permitidos | `image/jpeg`, `image/jpg`, `image/png`, `image/webp` |
| Tamano maximo raw (antes de comprimir) | 10 MB |
| Storage bucket | `user-avatars` (Supabase Storage) |

## Comportamiento

1. Si el usuario ya tenia avatar en el bucket `user-avatars`, se borra el anterior antes de subir el nuevo (evita archivos huerfanos).
2. Si el avatar anterior venia de otra fuente (Google OAuth, URL externa), se deja — solo se limpia lo que esta en nuestro bucket.
3. Fallos al borrar el avatar viejo no bloquean el upload nuevo (mejor tener un huerfano que fallar la operacion).

## Setup requerido en Supabase

**IMPORTANTE:** Antes de usar el endpoint en produccion, crear el bucket en Supabase:

1. Ir a Storage → New bucket
2. Nombre: `user-avatars`
3. Public bucket: **si** (para que las URLs sean accesibles sin firma)
4. File size limit: 1 MB (suficiente post-compresion)
5. Allowed MIME types: `image/webp` (solo guardamos webp)

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/users/users.service.ts` | Metodo `uploadAvatar()` con compresion sharp |
| `src/users/users.controller.ts` | Endpoint `POST /users/me/avatar` con `FileInterceptor` |
| `package.json` | Dependencia `sharp` |

## Constantes configurables

En `src/users/users.service.ts`:

```typescript
private readonly AVATAR_BUCKET = 'user-avatars';
private readonly AVATAR_MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB raw
private readonly AVATAR_OUTPUT_SIZE = 512; // px
private readonly AVATAR_QUALITY = 82; // WebP quality
```

Cambiar estas constantes si se necesita ajustar tamano o calidad.

## Extender a otros casos de uso

El mismo patron se puede replicar para:
- Logo de agencia (`Agency.logoUrl`) — bucket `agency-logos`, misma config
- Property images (ya existe, pero sin compresion — se podria migrar)
- Property documents (no aplica, son PDFs)

Para cada caso nuevo, copiar el metodo `uploadAvatar` como template y ajustar bucket + constantes.

---

*Documentado: 2026-04-05*
