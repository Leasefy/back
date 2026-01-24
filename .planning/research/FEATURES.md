# Features Research: Rental Marketplace Backend

**Date:** 2026-01-24
**Confidence:** HIGH

---

## Executive Summary

El backend debe implementar APIs que soporten el frontend existente. Las features se categorizan en:
- **Table Stakes:** Sin esto no funciona
- **Differentiators:** Lo que nos diferencia (Risk Score + AI)
- **Nice-to-Have:** V2+

---

## Table Stakes (Must Have)

### Authentication & Users

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| Register | POST /auth/register | Baja |
| Login | POST /auth/login | Baja |
| Logout | POST /auth/logout | Baja |
| Get current user | GET /auth/me | Baja |
| Update profile | PATCH /users/:id | Baja |
| User roles (tenant/landlord) | Middleware | Media |

### Properties CRUD

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| List properties | GET /properties | Media |
| Filter properties | GET /properties?city=&price=&bedrooms= | Media |
| Get property detail | GET /properties/:id | Baja |
| Create property | POST /properties | Media |
| Update property | PATCH /properties/:id | Baja |
| Delete property | DELETE /properties/:id | Baja |
| Upload images | POST /properties/:id/images | Media |
| List landlord properties | GET /landlords/:id/properties | Baja |

**Filtros requeridos:**
- city, neighborhood
- priceMin, priceMax
- bedrooms, bathrooms
- petFriendly, furnished, parking
- availableFrom

### Applications CRUD

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| Start application | POST /applications | Baja |
| Update step | PATCH /applications/:id | Media |
| Submit application | POST /applications/:id/submit | Alta |
| Get application | GET /applications/:id | Baja |
| List my applications | GET /applications?applicantId= | Baja |
| Withdraw application | POST /applications/:id/withdraw | Baja |

### Documents

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| Upload document | POST /applications/:id/documents | Media |
| Get document | GET /documents/:id | Baja |
| Delete document | DELETE /documents/:id | Baja |
| Get signed URL | GET /documents/:id/url | Baja |

### Application State Machine

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| Get status | GET /applications/:id/status | Baja |
| Transition status | POST /applications/:id/transition | Media |
| Get timeline | GET /applications/:id/events | Baja |

**Estados:**
```
DRAFT → SUBMITTED → UNDER_REVIEW → NEEDS_INFO → PREAPPROVED → APPROVED
                                 ↘ REJECTED
                   ↘ WITHDRAWN
```

---

## Differentiators (Core Value)

### Risk Score Engine ⭐

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| Trigger scoring | POST /applications/:id/score | Alta |
| Get score result | GET /applications/:id/score | Baja |
| Get score explanation | GET /applications/:id/score/explanation | Media |

**Componentes internos:**
- FeatureBuilder - Extrae features de datos de aplicación
- IntegrityEngine - Detecta fraude/inconsistencias
- FinancialModel - Calcula ratio y capacidad de pago
- StabilityModel - Evalúa estabilidad laboral/residencial
- HistoryModel - Evalúa historial y referencias
- DocumentAnalyzer - IA para analizar documentos
- Aggregator - Combina subscores → score final

**Output:**
```typescript
interface RiskScoreResult {
  totalScore: number;          // 0-100
  level: 'A' | 'B' | 'C' | 'D';
  recommendation: string;       // "Recomendado", "Condicional", etc.
  subscores: {
    integrity: number;
    financial: number;
    stability: number;
    history: number;
    documents: number;
  };
  drivers: string[];           // 3-6 razones principales
  flags: RiskFlag[];           // Alertas visuales
  suggestedConditions: Condition[];
  aiExplanation: string;       // Texto conversacional
}
```

### AI Document Analysis ⭐

| Feature | Complejidad |
|---------|-------------|
| Analyze ID document | Alta |
| Analyze employment letter | Alta |
| Analyze pay stubs | Alta |
| Analyze bank statements | Alta |
| Cross-validate extracted data | Alta |
| Fraud detection | Alta |

---

## Landlord Features

| Feature | Endpoint | Complejidad |
|---------|----------|-------------|
| List candidates | GET /properties/:id/candidates | Baja |
| Get candidate detail | GET /candidates/:id | Media |
| Compare candidates | GET /properties/:id/candidates/compare | Media |
| Pre-approve | POST /candidates/:id/preapprove | Baja |
| Approve | POST /candidates/:id/approve | Media |
| Reject | POST /candidates/:id/reject | Media |
| Request info | POST /candidates/:id/request-info | Baja |
| Add note | POST /candidates/:id/notes | Baja |
| Get notes | GET /candidates/:id/notes | Baja |

---

## Notifications

| Feature | Complejidad |
|---------|-------------|
| Application received (to landlord) | Media |
| Application submitted (to tenant) | Media |
| Status changed (to tenant) | Media |
| Info requested (to tenant) | Media |
| Approved/Rejected (to tenant) | Media |

---

## Nice-to-Have (V2+)

### Real-time Features
- WebSocket para updates de estado
- Notificaciones push
- Chat landlord-tenant

### Advanced Features
- Bulk property import
- Property analytics
- Scoring accuracy tracking
- A/B testing de scoring

### Integrations
- Datacrédito/TransUnion Colombia
- Verificación de identidad (Truora)
- Pagos (PSE, Nequi)
- Contratos electrónicos

---

## API Patterns

### Pagination
```
GET /properties?page=1&limit=20
Response: { data: [], meta: { total, page, limit, pages } }
```

### Filtering
```
GET /properties?city=bogota&priceMin=1000000&priceMax=3000000&bedrooms=2
```

### Sorting
```
GET /properties?sort=priceMonthly&order=asc
```

### Error Responses
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

### Versioning
- URL versioning: /api/v1/properties
- Header versioning (alternativa): Accept-Version: v1

---

## Dependencies Between Features

```
Properties CRUD
     ↓
Applications CRUD ──────────┐
     ↓                      │
Documents Upload            │
     ↓                      ↓
Document Analysis ───→ Risk Score Engine
                            ↓
                    Landlord Features (Candidates)
                            ↓
                    Notifications
```

**Build order sugerido:**
1. Auth + Users
2. Properties CRUD
3. Applications CRUD + State Machine
4. Documents Upload
5. Risk Score Engine (básico)
6. Document Analysis (AI)
7. Risk Score Engine (completo)
8. Landlord Features
9. Notifications

---

## Sources

- Frontend existente (Rent/front)
- [Airbnb API Patterns](https://www.airbnb.com/partner)
- [Zillow API Documentation](https://www.zillow.com/howto/api/APIOverview.htm)
- [REST API Best Practices](https://restfulapi.net/)
