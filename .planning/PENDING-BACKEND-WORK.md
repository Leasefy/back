# Trabajo Backend Pendiente (postergado)

**Fecha:** 2026-04-05
**Origen:** Frontend audit de mocks

Items que el frontend solicito pero se postergaron porque requieren decisiones de producto o features nuevas grandes.

---

## 1. Invoice PDF Download

**Endpoint solicitado:** `GET /inmobiliaria/billing/invoices/:id/pdf`

**Razon de postergacion:** No existe el concepto de `Invoice` en el schema. Implementar esto requiere:

1. Nuevo modelo `Invoice` en Prisma con: folio, fecha, items, taxes (IVA), cliente, total, PDF URL
2. Generacion automatica de invoice cuando se cobra una suscripcion (trigger desde `SubscriptionsService.processPayment()`)
3. Template HTML + Puppeteer para renderizar PDF (patron que ya existe para contratos en `ContractsModule`)
4. Endpoint de descarga con signed URL (1h expiry)
5. Listado de invoices del usuario/agencia

**Esfuerzo estimado:** 4-6 horas + definicion de template legal con contabilidad.

**Bloqueadores:**
- Definir formato legal colombiano (DIAN puede requerir electronic invoicing via proveedor autorizado)
- Decidir si se genera desde SubscriptionPayment existente o se crea tabla nueva

**Cuando hacerlo:** Cuando el producto tenga usuarios reales pagando suscripciones y se necesite contabilidad formal.

**Mientras tanto:** El front debe mantener el mock o ocultar el boton de download.

---

## 2. Update Payment Method

**Endpoint solicitado:** `PATCH /inmobiliaria/billing/payment-method`

**Razon de postergacion:** Requiere integracion con gateway de pagos real (Wompi, Stripe, ePayco, Mercado Pago). Actualmente PSE es mock (ver `PSE-MODE-CONFIG.md`).

**Esfuerzo estimado:** Depende del gateway elegido. Minimo 1-2 dias.

**Bloqueadores:**
- Decidir gateway de pagos
- Contratar cuenta comercial con el proveedor
- Integrar SDK y manejo de webhooks

**Cuando hacerlo:** Cuando se decida ir a produccion con pagos reales.

**Mientras tanto:** El front mantiene form de tarjeta deshabilitado o mock.

---

## 3. Propietarios Export

**Endpoint solicitado:** `POST /inmobiliaria/propietarios/export` (o similar para CSV/Excel)

**Estado:** No bloqueante. El front tiene boton pero no hace nada.

**Esfuerzo estimado:** 1-2 horas (generar CSV desde la lista existente).

**Cuando hacerlo:** Cuando sea pedido explicitamente por usuarios.

---

## 4. Real-time Updates (WebSocket/SSE)

**Componentes afectados:**
- Analytics dashboard
- Dispersiones (cambios de estado pending → processing → completed)
- Reports (actualizaciones automaticas)

**Razon de postergacion:** Es una mejora de UX. El refetch manual/por intervalo funciona bien para MVP.

**Esfuerzo estimado:** 4-6 horas para setup de WebSocket gateway + eventos.

**Cuando hacerlo:** Si usuarios reportan frustracion con tener que refrescar manualmente.

---

## 5. Integration Configuration

**Endpoint solicitado:** `PATCH /inmobiliaria/agency/integrations/:id/configure` (con body JSON de config)

**Estado actual:** Existe toggle on/off via `PUT /inmobiliaria/agency/integrations/:id` pero no configuracion detallada.

**Razon de postergacion:** Las integraciones actuales (Metrocuadrado, FincaRaiz, etc.) son placeholders sin integracion real. Configurar algo que no existe no tiene sentido.

**Cuando hacerlo:** Cuando se implemente integracion real con cada proveedor.

---

## 6. Reminders Log, Briefings, Decisions (trabajo nuevo v1.4+)

Ya documentado en otros analisis. Son features nuevas que no tienen backing en la DB:

- **Reminders log:** Historial de recordatorios enviados (requiere nueva tabla `ReminderLog`)
- **Briefings daily:** Agregacion diaria tipo newsletter (requiere trabajo de agregacion)
- **Decisions pending:** Unificacion de decisiones cross-modulo (requiere disenar el modelo)

**Cuando hacerlo:** Como parte de v1.4 si se decide priorizar el dashboard de inmobiliaria.

---

## Items YA RESUELTOS (para referencia)

Estos estaban en la lista inicial del front y fueron implementados:

| Item | Donde |
|------|-------|
| Avatar upload (con compresion) | `POST /users/me/avatar` (ver `AVATAR-UPLOAD-CONFIG.md`) |
| Position field en miembros | `PATCH /inmobiliaria/agency/members/:id/profile` |
| AI Activity + Metrics | `/inmobiliaria/ai/activity`, `/inmobiliaria/ai/metrics` |
| Reports enrichment (byMonth, byProperty, monthlyTrend) | Endpoints existentes en `/inmobiliaria/reports/*` mejorados |
| PSE_MODE feature flag | Variable de entorno (ver `PSE-MODE-CONFIG.md`) |

---

*Documentado: 2026-04-05*
