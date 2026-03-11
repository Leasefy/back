# Guía de Integración Frontend - Arriendo Fácil

**Última actualización:** 2026-01-30
**Backend Version:** v1.0 (Fases 1-4 completadas)

## Tabla de Contenidos

1. [Configuración Inicial](#1-configuración-inicial)
2. [Autenticación con Supabase](#2-autenticación-con-supabase)
3. [Comunicación con el Backend](#3-comunicación-con-el-backend)
4. [Endpoints Disponibles](#4-endpoints-disponibles)
5. [Flujos de Usuario](#5-flujos-de-usuario)
6. [Manejo de Errores](#6-manejo-de-errores)
7. [Ejemplos de Código](#7-ejemplos-de-código)

---

## 1. Configuración Inicial

### 1.1 Variables de Entorno

```env
# .env.local (Next.js) o .env (React)
NEXT_PUBLIC_SUPABASE_URL=https://jraqurdcjwnifzpdqtnm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
```

### 1.2 Instalación de Dependencias

```bash
# Para Next.js/React
npm install @supabase/supabase-js

# O con yarn
yarn add @supabase/supabase-js
```

### 1.3 Inicialización del Cliente Supabase

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Autenticación con Supabase

### 2.1 Flujo de Autenticación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Supabase  │────▶│   Backend   │
│             │     │    Auth     │     │   NestJS    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │
      │ 1. signInWithOAuth │                    │
      │───────────────────▶│                    │
      │                    │                    │
      │ 2. OAuth Redirect  │                    │
      │◀───────────────────│                    │
      │                    │                    │
      │ 3. Session + JWT   │                    │
      │◀───────────────────│                    │
      │                    │                    │
      │ 4. API Request + JWT Token              │
      │────────────────────────────────────────▶│
      │                    │                    │
      │ 5. Validate JWT (JWKS)                  │
      │                    │◀───────────────────│
      │                    │                    │
      │ 6. Response                             │
      │◀────────────────────────────────────────│
```

### 2.2 Login con Google

```typescript
// hooks/useAuth.ts
import { supabase } from '@/lib/supabase';

export function useAuth() {
  // Login con Google (usuario existente)
  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback'
      }
    });

    if (error) throw error;
    return data;
  };

  // Registro con Google (nuevo usuario)
  const signUpWithGoogle = async (userData: {
    role: 'TENANT' | 'LANDLORD' | 'BOTH';
    firstName?: string;
    lastName?: string;
  }) => {
    // Guardar datos para después del redirect
    localStorage.setItem('pendingRegistration', JSON.stringify({
      ...userData,
      isNewRegistration: true
    }));

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        queryParams: {
          prompt: 'select_account' // Forzar selección de cuenta
        }
      }
    });

    if (error) {
      localStorage.removeItem('pendingRegistration');
      throw error;
    }
    return data;
  };

  // Logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  // Obtener sesión actual
  const getSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  };

  return { signInWithGoogle, signUpWithGoogle, signOut, getSession };
}
```

### 2.3 Callback de Autenticación (Manejo Post-OAuth)

```typescript
// pages/auth/callback.tsx o app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase maneja automáticamente el token del URL
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login?error=auth_failed');
        return;
      }

      // Verificar si hay registro pendiente
      const pendingData = localStorage.getItem('pendingRegistration');

      if (pendingData) {
        const registration = JSON.parse(pendingData);
        localStorage.removeItem('pendingRegistration');

        if (registration.isNewRegistration) {
          // Completar onboarding en el backend
          await completeOnboarding(session.access_token, {
            firstName: registration.firstName || session.user.user_metadata?.full_name?.split(' ')[0] || 'Usuario',
            lastName: registration.lastName || session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
            userType: registration.role
          });
        }
      }

      // Redirigir al dashboard
      router.push('/dashboard');
    };

    handleCallback();
  }, [router]);

  return <div>Procesando autenticación...</div>;
}

async function completeOnboarding(token: string, data: {
  firstName: string;
  lastName: string;
  userType: string;
}) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users/me/onboarding`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    console.error('Error en onboarding:', await response.json());
  }
}
```

### 2.4 Listener de Cambios de Sesión

```typescript
// hooks/useAuthListener.ts
import { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useAuthListener() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Escuchar cambios
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setSession(session);

        if (event === 'SIGNED_OUT') {
          // Limpiar estado local
          localStorage.removeItem('pendingRegistration');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, isAuthenticated: !!session };
}
```

---

## 3. Comunicación con el Backend

### 3.1 Cliente API con Autenticación

```typescript
// lib/api.ts
import { supabase } from './supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

export async function apiGet<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const data = await response.json();

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.message || 'Error desconocido',
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}

export async function apiPost<T>(endpoint: string, body?: object): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.message || 'Error desconocido',
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}

export async function apiPatch<T>(endpoint: string, body: object): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'PATCH',
      headers: await getAuthHeaders(),
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.message || 'Error desconocido',
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}

export async function apiDelete<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'DELETE',
      headers: await getAuthHeaders(),
    });

    const data = response.status !== 204 ? await response.json() : null;

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data?.message || 'Error desconocido',
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}

// Para subir archivos (FormData)
export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<ApiResponse<T>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    const headers: HeadersInit = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    // NO incluir Content-Type para FormData (el browser lo pone automáticamente)

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();

    return {
      data: response.ok ? data : null,
      error: response.ok ? null : data.message || 'Error desconocido',
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    };
  }
}
```

---

## 4. Endpoints Disponibles

### 4.1 Health Check (Público)

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| GET | `/health` | No | Verificar estado del servidor |

### 4.2 Usuarios

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | `/users/me` | Sí | Cualquiera | Obtener perfil actual |
| PATCH | `/users/me` | Sí | Cualquiera | Actualizar perfil |
| POST | `/users/me/onboarding` | Sí | Cualquiera | Completar onboarding |
| GET | `/users/me/onboarding/status` | Sí | Cualquiera | Ver estado de onboarding |
| PATCH | `/users/me/role` | Sí | BOTH | Cambiar rol activo |

**DTOs:**

```typescript
// PATCH /users/me
interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string; // Formato: +573001234567
}

// POST /users/me/onboarding
interface CompleteOnboardingDto {
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'TENANT' | 'LANDLORD' | 'BOTH';
}

// PATCH /users/me/role
interface SwitchRoleDto {
  activeRole: 'TENANT' | 'LANDLORD';
}
```

### 4.3 Propiedades

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| GET | `/properties` | No | - | Listar propiedades públicas |
| GET | `/properties/:id` | No | - | Ver detalle de propiedad |
| GET | `/properties/mine` | Sí | LANDLORD | Listar mis propiedades |
| POST | `/properties` | Sí | LANDLORD | Crear propiedad |
| PATCH | `/properties/:id` | Sí | LANDLORD (dueño) | Actualizar propiedad |
| DELETE | `/properties/:id` | Sí | LANDLORD (dueño) | Eliminar propiedad |
| POST | `/properties/:id/images` | Sí | LANDLORD (dueño) | Subir imagen |
| DELETE | `/properties/:id/images/:imageId` | Sí | LANDLORD (dueño) | Eliminar imagen |
| PATCH | `/properties/:id/images/reorder` | Sí | LANDLORD (dueño) | Reordenar imágenes |

**DTOs:**

```typescript
// POST /properties
interface CreatePropertyDto {
  title: string;              // 5-100 chars
  description: string;        // 20-5000 chars
  type: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM';
  status?: 'DRAFT' | 'AVAILABLE' | 'RENTED' | 'PENDING'; // default: DRAFT
  city: string;               // max 50
  neighborhood: string;       // max 100
  address: string;            // max 200
  latitude?: number;
  longitude?: number;
  monthlyRent: number;        // 100,000 - 100,000,000 COP
  adminFee?: number;          // default: 0
  deposit?: number;           // default: 0
  bedrooms: number;           // 0-20
  bathrooms: number;          // 1-10
  area: number;               // 10-10,000 m²
  floor?: number;             // 0-100
  parkingSpaces?: number;     // 0-10
  stratum?: number;           // 1-6 (estrato colombiano)
  yearBuilt?: number;         // 1900-2100
  amenities?: string[];       // IDs: pool, gym, security, parking, etc.
}

// Query params para GET /properties
interface FilterPropertiesDto {
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: 'APARTMENT' | 'HOUSE' | 'STUDIO' | 'ROOM';
  amenities?: string;         // comma-separated: "pool,gym,parking"
  searchQuery?: string;       // búsqueda full-text
  page?: number;              // default: 1
  limit?: number;             // default: 20, max: 100
}
```

**Amenities válidos:**
```typescript
const VALID_AMENITIES = [
  'pool', 'gym', 'security', 'parking', 'elevator',
  'terrace', 'bbq', 'playground', 'laundry', 'pets',
  'furnished', 'balcony', 'storage', 'ac', 'heating'
];
```

### 4.4 Aplicaciones

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/applications` | Sí | TENANT | Crear aplicación |
| GET | `/applications/mine` | Sí | TENANT | Listar mis aplicaciones |
| GET | `/applications/:id` | Sí | TENANT (dueño) | Ver aplicación |
| PATCH | `/applications/:id/steps/1` | Sí | TENANT | Paso 1: Info personal |
| PATCH | `/applications/:id/steps/2` | Sí | TENANT | Paso 2: Info laboral |
| PATCH | `/applications/:id/steps/3` | Sí | TENANT | Paso 3: Info ingresos |
| PATCH | `/applications/:id/steps/4` | Sí | TENANT | Paso 4: Referencias |
| POST | `/applications/:id/submit` | Sí | TENANT | Enviar aplicación |
| POST | `/applications/:id/withdraw` | Sí | TENANT | Retirar aplicación |
| GET | `/applications/:id/timeline` | Sí | TENANT | Ver timeline de eventos |
| POST | `/applications/:id/respond-info` | Sí | TENANT | Responder solicitud info |

**DTOs:**

```typescript
// POST /applications
interface CreateApplicationDto {
  propertyId: string; // UUID de la propiedad
}

// PATCH /applications/:id/steps/1
interface PersonalInfoDto {
  fullName: string;           // 3-100 chars
  cedula: string;             // 6-10 dígitos
  dateOfBirth: string;        // ISO date: "1990-05-15"
  email: string;              // email válido
  phone: string;              // +573001234567
  currentAddress?: string;    // max 200
}

// PATCH /applications/:id/steps/2
interface EmploymentInfoDto {
  employmentType: 'EMPLOYED' | 'SELF_EMPLOYED' | 'CONTRACTOR' | 'UNEMPLOYED' | 'RETIRED' | 'STUDENT';
  companyName?: string;       // 2-100 chars
  jobTitle?: string;          // max 100
  startDate?: string;         // ISO date
  workAddress?: string;       // max 200
  hrContactPhone?: string;
  hrContactEmail?: string;
}

// PATCH /applications/:id/steps/3
interface IncomeInfoDto {
  monthlySalary: number;           // min 0, en COP
  additionalIncome?: number;       // min 0
  additionalIncomeSource?: string; // max 200
  monthlyDebtPayments?: number;    // min 0
  debtDescription?: string;        // max 300
}

// PATCH /applications/:id/steps/4
interface ReferencesDto {
  landlordReference?: {      // Opcional
    name: string;
    relationship: string;
    phone: string;           // +57...
    email?: string;
  };
  employmentReference: {     // Requerido
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  };
  personalReferences: [{     // Array, mínimo 1
    name: string;
    relationship: string;
    phone: string;
    email?: string;
  }];
}

// POST /applications/:id/submit
interface SubmitApplicationDto {
  message?: string;          // Mensaje opcional para el propietario
}

// POST /applications/:id/withdraw
interface WithdrawApplicationDto {
  reason?: string;           // Razón del retiro
}
```

### 4.5 Documentos

| Método | Endpoint | Auth | Rol | Descripción |
|--------|----------|------|-----|-------------|
| POST | `/documents/upload` | Sí | TENANT | Subir documento |
| GET | `/documents/application/:id` | Sí | TENANT | Listar documentos de aplicación |
| GET | `/documents/:id/url` | Sí | TENANT | Obtener URL firmada |
| DELETE | `/documents/:id` | Sí | TENANT | Eliminar documento |

**DTOs:**

```typescript
// POST /documents/upload (FormData)
// Content-Type: multipart/form-data
interface UploadDocumentFormData {
  file: File;                 // PDF, JPG, PNG, WebP - max 10MB
  applicationId: string;      // UUID
  type: 'CEDULA' | 'EMPLOYMENT_LETTER' | 'PAY_STUB' | 'BANK_STATEMENT' | 'OTHER';
}
```

---

## 5. Flujos de Usuario

### 5.1 Flujo de Registro

```typescript
// 1. Usuario hace click en "Registrarse"
const handleRegister = async (role: 'TENANT' | 'LANDLORD' | 'BOTH') => {
  // Guardar datos para después del OAuth
  localStorage.setItem('pendingRegistration', JSON.stringify({
    role,
    isNewRegistration: true
  }));

  // Iniciar OAuth
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: '/auth/callback' }
  });
};

// 2. En /auth/callback, completar onboarding
// (Ver sección 2.3)
```

### 5.2 Flujo de Crear Propiedad (Landlord)

```typescript
// 1. Crear propiedad
const { data: property } = await apiPost('/properties', {
  title: 'Apartamento moderno en Chapinero',
  description: 'Hermoso apartamento con vista...',
  type: 'APARTMENT',
  city: 'Bogota',
  neighborhood: 'Chapinero',
  address: 'Calle 53 #7-25',
  monthlyRent: 2500000,
  bedrooms: 2,
  bathrooms: 2,
  area: 75,
  stratum: 4
});

// 2. Subir imágenes
const formData = new FormData();
formData.append('file', imageFile);
formData.append('order', '0'); // Primera imagen = thumbnail

await apiUpload(`/properties/${property.id}/images`, formData);

// 3. Publicar propiedad
await apiPatch(`/properties/${property.id}`, {
  status: 'AVAILABLE'
});
```

### 5.3 Flujo de Aplicación (Tenant)

```typescript
// 1. Crear aplicación
const { data: application } = await apiPost('/applications', {
  propertyId: 'uuid-de-la-propiedad'
});

// 2. Completar wizard
// Paso 1: Info personal
await apiPatch(`/applications/${application.id}/steps/1`, {
  fullName: 'Juan García',
  cedula: '1234567890',
  dateOfBirth: '1990-05-15',
  email: 'juan@email.com',
  phone: '+573001234567'
});

// Paso 2: Info laboral
await apiPatch(`/applications/${application.id}/steps/2`, {
  employmentType: 'EMPLOYED',
  companyName: 'Tech Corp',
  jobTitle: 'Desarrollador',
  startDate: '2022-01-01'
});

// Paso 3: Info ingresos
await apiPatch(`/applications/${application.id}/steps/3`, {
  monthlySalary: 5000000,
  additionalIncome: 0
});

// Paso 4: Referencias
await apiPatch(`/applications/${application.id}/steps/4`, {
  employmentReference: {
    name: 'Carlos Jefe',
    relationship: 'Jefe directo',
    phone: '+573001112233'
  },
  personalReferences: [{
    name: 'María Hermana',
    relationship: 'Hermana',
    phone: '+573009876543'
  }]
});

// 3. Subir documento
const docFormData = new FormData();
docFormData.append('file', cedulaFile);
docFormData.append('applicationId', application.id);
docFormData.append('type', 'CEDULA');

await apiUpload('/documents/upload', docFormData);

// 4. Enviar aplicación
await apiPost(`/applications/${application.id}/submit`, {
  message: 'Estoy muy interesado en este apartamento'
});
```

---

## 6. Manejo de Errores

### 6.1 Estructura de Errores

```typescript
interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
```

### 6.2 Códigos de Error Comunes

| Código | Significado | Acción |
|--------|-------------|--------|
| 400 | Bad Request (validación) | Mostrar errores de validación |
| 401 | No autenticado | Redirigir a login |
| 403 | Sin permiso (rol incorrecto) | Mostrar mensaje de acceso denegado |
| 404 | No encontrado | Mostrar mensaje / redirigir |
| 409 | Conflicto (duplicado) | Mostrar mensaje específico |
| 500 | Error del servidor | Mostrar error genérico, reintentar |

### 6.3 Hook de Manejo de Errores

```typescript
// hooks/useApiError.ts
import { useRouter } from 'next/navigation';
import { toast } from 'your-toast-library';

export function useApiError() {
  const router = useRouter();

  const handleError = (status: number, message: string | string[]) => {
    const errorMessage = Array.isArray(message) ? message.join(', ') : message;

    switch (status) {
      case 401:
        toast.error('Sesión expirada. Por favor inicia sesión.');
        router.push('/login');
        break;
      case 403:
        toast.error('No tienes permiso para realizar esta acción.');
        break;
      case 404:
        toast.error('El recurso no fue encontrado.');
        break;
      case 400:
        toast.error(errorMessage || 'Datos inválidos.');
        break;
      default:
        toast.error('Ocurrió un error. Por favor intenta de nuevo.');
    }
  };

  return { handleError };
}
```

---

## 7. Ejemplos de Código

### 7.1 Componente de Login

```tsx
// components/LoginButton.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error de login:', error);
      alert('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleLogin} disabled={loading}>
      {loading ? 'Cargando...' : 'Iniciar sesión con Google'}
    </button>
  );
}
```

### 7.2 Listado de Propiedades

```tsx
// components/PropertyList.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

interface Property {
  id: string;
  title: string;
  city: string;
  monthlyRent: number;
  images: { url: string; order: number }[];
}

interface PropertiesResponse {
  data: Property[];
  meta: {
    total: number;
    page: number;
    totalPages: number;
  };
}

export function PropertyList() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    const { data, error } = await apiGet<PropertiesResponse>('/properties');

    if (error) {
      console.error('Error:', error);
      return;
    }

    setProperties(data?.data || []);
    setLoading(false);
  };

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {properties.map(property => (
        <div key={property.id} className="border rounded p-4">
          {property.images[0] && (
            <img
              src={property.images[0].url}
              alt={property.title}
              className="w-full h-48 object-cover"
            />
          )}
          <h3>{property.title}</h3>
          <p>{property.city}</p>
          <p>${property.monthlyRent.toLocaleString()}/mes</p>
        </div>
      ))}
    </div>
  );
}
```

### 7.3 Subida de Imágenes

```tsx
// components/ImageUploader.tsx
'use client';

import { useState } from 'react';
import { apiUpload } from '@/lib/api';

interface Props {
  propertyId: string;
  onUploadComplete: () => void;
}

export function ImageUploader({ propertyId, onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      setProgress(`Subiendo ${i + 1} de ${files.length}...`);

      const formData = new FormData();
      formData.append('file', files[i]);
      formData.append('order', i.toString());

      const { error } = await apiUpload(
        `/properties/${propertyId}/images`,
        formData
      );

      if (error) {
        alert(`Error subiendo ${files[i].name}: ${error}`);
      }
    }

    setUploading(false);
    setProgress('');
    onUploadComplete();
  };

  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {progress && <p>{progress}</p>}
    </div>
  );
}
```

---

## Flujo de Registro Inmobiliaria

Este flujo cubre el registro de una nueva empresa inmobiliaria (INMOBILIARIA) y la incorporacion de su equipo. Requiere que el admin este autenticado via Supabase antes de comenzar.

### 1. Registro del Admin (crea agencia)

```typescript
// POST /users/me/onboarding
// Requiere: Bearer token del admin

const body = {
  userType: 'INMOBILIARIA',
  firstName: 'Carlos',
  lastName: 'Rodriguez',
  agency: {
    name: 'Inmobiliaria Test SA',
    nit: '900.123.456-7',   // opcional
    city: 'Bogota',          // opcional
    phone: '3001234567',     // opcional
    email: 'info@agencia.com' // opcional
  }
};

// Response: { user, agency: { id, name, city, ... }, onboardingStep: 'agency_created' }
```

El admin queda automaticamente como miembro ADMIN de la agencia con status ACTIVE.

### 2. Invitar Miembros (Admin)

```typescript
// POST /inmobiliaria/agency/members
// Requiere: Bearer token del admin (debe ser ADMIN de la agencia)

const body = {
  email: 'agente@empresa.com',
  role: 'AGENTE'  // 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER'
};

// Response: { id, status: 'INVITED', invitedEmail, role, agencyId }
// NOTA: invitationToken NO se expone en la respuesta — se envia por email
```

El usuario invitado debe estar registrado en la plataforma. Si el email no existe, retorna 404.

### 3. El Invitado Acepta (desde link del email)

```typescript
// Paso 3a: Ver info de la invitacion (SIN auth — pagina de bienvenida)
// GET /inmobiliaria/agency/invitations/:token
// No requiere Authorization header

// Response: { agencyName, agencyCity, role, invitedEmail, expiresAt }
```

```typescript
// Paso 3b: Aceptar la invitacion (CON auth)
// POST /inmobiliaria/agency/invitations/:token/accept
// Requiere: Bearer token del invitado (debe estar autenticado)

// Response: { id, status: 'ACTIVE', userId, agencyId, role }
// El invitationToken queda en null — no puede reutilizarse
```

```typescript
// Alternativa: Rechazar la invitacion (SIN auth)
// POST /inmobiliaria/agency/invitations/:token/decline

// Response: { id, status: 'INACTIVE' }
```

### 4. Reenviar Invitacion (Admin)

```typescript
// POST /inmobiliaria/agency/members/:memberId/resend-invitation
// Requiere: Bearer token del admin

// Solo funciona si el miembro esta en estado INVITED
// Genera nuevo token, renueva expiresAt a 7 dias, reenvia email

// Response: { id, status: 'INVITED', invitationExpiresAt }
```

### 5. Checklist de Setup

```typescript
// GET /inmobiliaria/agency/onboarding-status
// Requiere: Bearer token de cualquier miembro activo de la agencia

// Response:
// {
//   steps: [
//     { key: 'agency_created', label: 'Agencia creada', complete: true },
//     { key: 'agency_profile', label: 'Perfil completo (direccion y NIT)', complete: false },
//     { key: 'first_member', label: 'Primer miembro invitado', complete: false },
//     { key: 'logo_uploaded', label: 'Logo subido', complete: false },
//     { key: 'first_property', label: 'Primera propiedad registrada', complete: false }
//   ],
//   completedCount: 1,
//   completionPercent: 20,
//   isComplete: false
// }
```

### Resumen de Endpoints Inmobiliaria (Phase 23)

| Metodo | Endpoint | Auth | Rol | Descripcion |
|--------|----------|------|-----|-------------|
| POST | `/users/me/onboarding` | Si | Cualquiera | Onboarding como INMOBILIARIA (crea agencia) |
| GET | `/inmobiliaria/agency` | Si | Miembro activo | Ver mi agencia |
| PUT | `/inmobiliaria/agency` | Si | ADMIN | Actualizar agencia |
| GET | `/inmobiliaria/agency/members` | Si | Miembro activo | Ver miembros |
| POST | `/inmobiliaria/agency/members` | Si | ADMIN | Invitar miembro |
| GET | `/inmobiliaria/agency/invitations/:token` | No (Publico) | - | Info de invitacion |
| POST | `/inmobiliaria/agency/invitations/:token/accept` | Si | Cualquiera | Aceptar invitacion |
| POST | `/inmobiliaria/agency/invitations/:token/decline` | No (Publico) | - | Rechazar invitacion |
| POST | `/inmobiliaria/agency/members/:id/resend-invitation` | Si | ADMIN | Reenviar invitacion |
| GET | `/inmobiliaria/agency/onboarding-status` | Si | Miembro activo | Checklist de setup |

### Codigos de Error Esperados

| Escenario | HTTP | Mensaje |
|-----------|------|---------|
| Token invalido o ya usado | 404 | Invitation token not found or already used |
| Token expirado | 400 | Invitation token has expired |
| Invitacion ya aceptada/rechazada | 400 | This invitation has already been used or is no longer valid |
| Usuario ya es miembro | 409 | You are already a member of this agency |
| Email no existe en plataforma | 404 | User with email X not found on the platform |
| No es ADMIN | 403 | Only agency administrators can perform this action |
| No tiene agencia | 404 | You are not a member of any agency |

---

## Anexos

### A. Estados de Aplicación

```
DRAFT ──────────────────────────────────────────┐
   │                                             │
   ▼                                             │
SUBMITTED ──────────────────────────────────────┤
   │                                             │
   ▼                                             │
UNDER_REVIEW ───────────────────────────────────┤
   │         │         │         │               │
   │         ▼         ▼         ▼               │
   │   NEEDS_INFO  PREAPPROVED  REJECTED        │
   │      │  │         │                        │
   │      │  │         ▼                        │
   │      │  │     APPROVED                     │
   │      │  │                                  │
   │      ▼  ▼                                  │
   └──────────────── WITHDRAWN ◀────────────────┘
```

### B. Roles y Permisos

| Acción | TENANT | LANDLORD | BOTH |
|--------|--------|----------|------|
| Ver propiedades públicas | ✅ | ✅ | ✅ |
| Crear propiedad | ❌ | ✅ | ✅ |
| Aplicar a propiedad | ✅ | ❌ | ✅ |
| Ver candidatos | ❌ | ✅ | ✅ |
| Cambiar rol activo | ❌ | ❌ | ✅ |

### C. Archivo de Referencia

Ver `pruebaLogin.html` en esta misma carpeta para un ejemplo funcional completo de integración con todos los endpoints.
