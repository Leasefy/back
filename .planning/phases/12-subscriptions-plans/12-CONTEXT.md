# Phase 12: Subscriptions & Plans - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Pricing plans for landlords and tenants with mock payment processing, plan enforcement, and admin-managed pricing. Cupones diferidos para fase futura.

</domain>

<decisions>
## Implementation Decisions

### Planes por Rol

**Planes son DIFERENTES para Tenant y Landlord:**

**Tenant Plans:**
- **Free**: Ve scoring basico de 1 aplicacion/mes gratis. No ve scoring premium (AI + historial pagos).
- **Pro**: Ve scoring premium de todas sus aplicaciones. Acceso completo.
- **Micropago**: Tenant free puede pagar por vista individual de scoring premium ($X por vista).

**Landlord Plans:**
- **Free**: Publica 1 propiedad. Ve scoring basico de candidatos. No ve scoring premium (AI).
- **Pro**: Publica hasta 10 propiedades. Ve scoring premium de candidatos.
- **Business**: Propiedades ilimitadas. API access. Scoring premium completo.

**Los planes de landlord son mas costosos que los de tenant.** Los precios exactos se configuran via endpoint administrativo.

### Procesamiento de Pagos

- **Mock**: Reusar el PSE mock de Phase 10 (mismo flujo, resultado simulado)
- **Ciclo de facturacion**: Mensual + Anual (con descuento anual)
- **Micropago por vista**: Precio fijo por cada vista adicional de scoring premium (tenant free)
- **Cambio de plan mid-cycle**: Permitido. Se cobra la diferencia y el nuevo ciclo inicia al dia siguiente del proximo mes.

### Trial Period

- **7 dias gratis** de Pro para nuevos usuarios
- **Notificacion** el dia antes de que termine el trial avisando que se acaba
- **Al vencer trial sin pago**: Downgrade automatico a free
  - Landlord: Solo 1 propiedad queda publicada (aleatoria), las demas pasan a "sin publicar" (draft/unavailable)
  - Tenant: Pierde acceso a scoring premium

### Vencimiento y Downgrade

- **Downgrade automatico a free** cuando vence la suscripcion sin renovacion
- Propiedades extra del landlord se ocultan (no se borran), solo 1 queda publicada
- El usuario debe pagar para volver a publicar mas propiedades
- No hay periodo de gracia: vence = downgrade inmediato

### Scoring Access por Plan

| Plan | Scoring Basico | Scoring Premium (AI) | Vistas Scoring |
|------|---------------|---------------------|----------------|
| Tenant Free | 1/mes gratis | No | Micropago por vista extra |
| Tenant Pro | Ilimitado | Si | Ilimitado |
| Landlord Free | Si (candidatos) | No | No |
| Landlord Pro | Si | Si | Ilimitado |
| Landlord Business | Si | Si | Ilimitado + API |

### Administracion de Precios

- **Endpoint administrativo** (ADMIN role) para modificar precios de todos los planes
- Admin puede cambiar: precio mensual, precio anual, precio micropago
- Precios configurables por separado para tenant y landlord

### Cupones

- **Diferidos** para fase futura. No se implementan en Phase 12.

### Claude's Discretion

- Modelo de datos especifico para subscriptions (tabla Subscription, SubscriptionPlan, etc.)
- Logica de prorrateado para cambio de plan mid-cycle
- Como seleccionar aleatoriamente cual propiedad queda publicada en downgrade
- Estructura del endpoint de precios admin
- Descuento exacto para plan anual vs mensual (se configura via admin)

</decisions>

<specifics>
## Specific Ideas

- Reusar el sistema PSE mock de Phase 10 para pagos de suscripcion
- Reusar el rol ADMIN de Phase 11 para endpoints de precios
- Notificaciones de trial/vencimiento via el sistema de Phase 11
- Los precios del frontend ($149,900/mes Pro, $499,900/mes Business) son para landlord. Los de tenant son diferentes (mas bajos).

</specifics>

<deferred>
## Deferred Ideas

- **Sistema de cupones** - Diferido para fase futura (usuario decidio no incluirlo ahora)
- **Pasarela de pago real** - Actualmente mock, futura integracion con ePayco/Wompi
- **Facturacion electronica DIAN** - Requerimiento legal colombiano para facturacion real

</deferred>

---

*Phase: 12-subscriptions-plans*
*Context gathered: 2026-02-04*
