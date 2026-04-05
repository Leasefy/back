# Fix requerido: manejo de 401 "User not found" en auth-context.tsx

**Para:** Frontend AI / equipo frontend
**Desde:** Backend
**Fecha:** 2026-04-05
**Prioridad:** ALTA (bug actual en local y futuro en produccion)

---

## Resumen del problema

El `auth-context.tsx` (linea ~107) llama a `GET /users/me` inmediatamente despues del login, pero NO maneja correctamente el caso donde el JWT es valido pero el usuario no existe aun en la base de datos del backend.

Resultado actual: el front queda colgado con 401, no redirige al onboarding, y el usuario nunca completa su registro.

---

## Contexto tecnico: las dos tablas de usuarios

Hay **dos tablas separadas** con registros de usuarios:

| Tabla | Vive en | Rol | Cuando se crea |
|-------|---------|-----|----------------|
| `auth.users` | Schema de Supabase Auth | Credenciales, OAuth, firma de JWT | Cuando alguien hace login con Google OAuth (automatico) |
| `public.users` | Schema de la app (Prisma) | Datos de negocio: rol, perfil, avatar, etc. | Solo cuando se llama explicitamente al endpoint de onboarding |

**Un JWT valido NO garantiza que el usuario exista en `public.users`.** El JWT solo prueba que Supabase Auth autentico al usuario, pero el registro en la app puede no haberse creado todavia.

## Cuando se da el caso "JWT valido pero sin registro en public.users"

1. **Primer login de un usuario nuevo.** Se registra con Google → Supabase crea el registro en `auth.users` → devuelve JWT → el front tiene que llamar a un endpoint de onboarding para crear el registro en `public.users`. Si el front salta ese paso, queda en este estado.

2. **Reset de DB en desarrollo.** Cuando se resetea la base de datos del backend, `public.users` se vacia pero `auth.users` (de Supabase) NO se toca. Todos los usuarios existentes quedan con JWT valido pero sin registro en la app.

3. **Failover de ambiente.** Si se migra a una DB nueva (staging, test, clone de prod), los usuarios ya registrados en Supabase Auth quedan sin registro en la DB nueva.

---

## Como lo maneja el backend actualmente

El backend ahora **auto-provisiona** al usuario en `public.users` cuando recibe un JWT valido sin registro. Esto es una red de seguridad (safety net) pero:

- Asigna `role: TENANT` por defecto (el menos privilegiado)
- No respeta la eleccion explicita de tipo de usuario (landlord / tenant / inmobiliaria) que normalmente se hace en el onboarding
- No setea campos como RUT, direccion, telefono, datos de agencia, etc.

Por eso el front **sigue necesitando** implementar el flujo de onboarding correcto.

---

## Lo que el front debe hacer

### 1. Detectar cuando el usuario NO completo el onboarding

Hay dos señales:

**Señal A — el backend devuelve 401 con el mensaje "User not found":**

```json
{
  "statusCode": 401,
  "message": "User not found. Please ensure your account is set up correctly.",
  "path": "/users/me",
  "timestamp": "..."
}
```

**Señal B — el backend devuelve 200 pero el usuario tiene rol `TENANT` y campos vacios** (porque fue auto-provisionado sin pasar por onboarding real).

Para distinguir un `TENANT` real de uno auto-provisionado, el front puede chequear si tiene campos de perfil rellenos. Mas simple: agregar un flag `onboardingCompleted` en el schema del backend (requiere trabajo backend).

**Recomendacion por ahora:** usar solo la Señal A. Cuando el backend deje de auto-provisionar (ver seccion "a futuro"), la Señal A sera 100% confiable.

### 2. Arreglar `auth-context.tsx`

La llamada a `/users/me` en el auth context debe manejar el error correctamente. Pseudo-codigo esperado:

```typescript
// auth-context.tsx
async function loadCurrentUser(token: string) {
  try {
    const response = await apiClient.get('/users/me');
    return { user: response, needsOnboarding: false };
  } catch (err) {
    // Si es 401 con mensaje de "User not found", el usuario no completo onboarding
    if (err.status === 401 && err.message?.includes('User not found')) {
      return { user: null, needsOnboarding: true };
    }
    // Cualquier otro 401 es un token invalido → logout
    if (err.status === 401) {
      await logout();
      return { user: null, needsOnboarding: false };
    }
    throw err;
  }
}
```

Luego en el layout o en el middleware de rutas:

```typescript
const { user, needsOnboarding, isLoading } = useAuth();

if (isLoading) return <Loader />;

if (needsOnboarding) {
  router.replace('/onboarding');
  return null;
}

if (!user) {
  router.replace('/login');
  return null;
}

// Usuario OK, renderizar la app
return children;
```

### 3. Implementar/verificar la pantalla de onboarding

Cuando el usuario llega a `/onboarding`, el flujo debe:

1. Mostrar pantalla de seleccion de tipo: inquilino / propietario / inmobiliaria
2. Capturar datos basicos: nombre (si no viene de Google), telefono, etc.
3. Llamar al endpoint del backend: `POST /users/me/onboarding`
4. Redirigir al dashboard correspondiente

**Endpoint del backend:**

```
POST /users/me/onboarding
Content-Type: application/json
Authorization: Bearer {jwt}

Body:
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "phone": "string (required)",
  "userType": "TENANT | LANDLORD | INMOBILIARIA"
}
```

**Response 200:** Devuelve el `User` actualizado con el rol correcto asignado. Para `userType: INMOBILIARIA` tambien crea una agencia nueva y devuelve `{ user, agency, onboardingStep }`.

Despues de llamar a este endpoint, refrescar el auth-context y redirigir.

---

## Flujo completo esperado

```
[Usuario nuevo entra al sitio]
         ↓
[Click "Login con Google"]
         ↓
[Supabase OAuth flow]
         ↓
[Front recibe JWT de Supabase]
         ↓
[auth-context llama GET /users/me]
         ↓
    ┌────┴────┐
    ↓         ↓
  200 OK   401 "User not found"
    ↓         ↓
[Dashboard] [Redirigir a /onboarding]
              ↓
          [Usuario completa form]
              ↓
          [POST /users/me/onboarding]
              ↓
          [Refrescar auth-context]
              ↓
          [Redirigir a /dashboard]
```

---

## Pruebas que tiene que pasar el fix

**Escenario 1 — Usuario completamente nuevo:**
1. Limpiar cookies/localStorage
2. Login con Google (email que nunca se uso)
3. Debe redirigir automaticamente a `/onboarding`
4. Completar form → click siguiente
5. Debe redirigir a `/panel`
6. `GET /users/me` debe devolver el usuario con el rol elegido

**Escenario 2 — Usuario con reset de DB en dev:**
1. Usuario ya existe en Supabase Auth (tiene cookies con JWT valido)
2. Dev hace reset de `public.users`
3. Usuario refresca la pagina
4. Debe redirigir automaticamente a `/onboarding` (NO quedar en loop con 401)
5. Completa onboarding → funciona normal

**Escenario 3 — Token realmente expirado o invalido:**
1. JWT expirado en cookies
2. Usuario refresca
3. Backend devuelve 401 pero SIN el mensaje "User not found"
4. Front debe hacer logout y redirigir a `/login` (NO a onboarding)

---

## A futuro (decidir en conjunto)

Cuando el fix del front este desplegado y verificado, el backend puede **quitar la auto-provisioning** de `SupabaseStrategy.validate()` y volver a lanzar 401 estricto. Esto es preferible porque:

- El onboarding formal del front siempre se ejecuta (no hay camino lateral)
- Los campos de perfil siempre quedan completos
- El rol se asigna explicitamente, no por default

Mientras tanto, la auto-provisioning esta activa como red de seguridad para no bloquear a usuarios existentes.

---

## Archivos del backend involucrados (referencia)

- `src/auth/strategies/supabase.strategy.ts` — donde vive la auto-provisioning actual
- `src/users/users.controller.ts` — endpoint `POST /users/me/onboarding`
- `src/users/users.service.ts` — metodo `completeOnboarding()`
- `src/users/dto/complete-onboarding.dto.ts` — shape del request body

---

*Generado: 2026-04-05*
