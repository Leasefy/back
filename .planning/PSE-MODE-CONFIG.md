# PSE Payment Gateway — Modo de Funcionamiento

**Fecha:** 2026-04-05
**Estado:** Mock activo (real pendiente de implementacion)

## Resumen

El sistema de pagos PSE tiene dos modos controlados por la variable de entorno `PSE_MODE`:

- **`mock`** (default) — Simulador determinista para dev/staging/testing
- **`real`** — Pasarela PSE real en produccion (no implementada aun)

Esto permite que en ambientes de prueba se use siempre el mock, mientras que produccion pueda cambiar a `real` cuando se implemente la integracion con un proveedor PSE real.

---

## Variable de entorno

**Archivo:** `.env` (y `.env.example`)

```bash
# PSE Payment Gateway
# mock = simulador determinista (dev/staging/testing)
# real = pasarela PSE real (no implementada aun)
PSE_MODE=mock
```

**Default:** Si no se define, el sistema arranca en modo `mock` automaticamente.

---

## Comportamiento por modo

### Modo `mock`

`PseMockService.processPayment()` retorna resultados deterministas basados en el ultimo digito del `documentNumber`:

| Ultimo digito | Resultado | Mensaje |
|---------------|-----------|---------|
| `0` | FAILURE | Fondos insuficientes en la cuenta bancaria |
| `1` | FAILURE | Transaccion rechazada por el banco |
| `9` | PENDING | Transaccion pendiente de verificacion bancaria |
| Otros | SUCCESS | Pago procesado exitosamente |

Esto permite al frontend probar todos los escenarios de pago sin depender de una pasarela real.

### Modo `real`

Por ahora, lanza `NotImplementedException` (HTTP 501) con el mensaje:
> "La pasarela PSE real no esta implementada. Configura PSE_MODE=mock para usar el simulador."

Este es el punto de integracion donde se debe implementar la llamada a la pasarela PSE real cuando se tenga el SDK/API del proveedor.

---

## Donde se usa PSE en el codigo

El metodo `PseMockService.processPayment()` es llamado por:

1. **`AgentCreditsService.purchaseCredits()`** — Compra de creditos de evaluacion
2. **`SubscriptionsService`** — Pagos de suscripcion
3. **`TenantPaymentsService`** — Pagos de arriendo simulados
4. **`CobrosService.registerPayment()`** (indirecto via Flex Billing) — Cobros de inmobiliaria

Ninguno de estos necesita cambiar cuando se active el modo real. Solo el bloque dentro de `processPayment()` debe implementar la llamada real.

---

## Como implementar el modo real (guia futura)

**Archivo:** `src/tenant-payments/pse-mock/pse-mock.service.ts`

Actualmente el metodo tiene esta estructura:

```typescript
processPayment(dto: PseMockRequestDto) {
  if (this.mode === 'real') {
    throw new NotImplementedException(
      'La pasarela PSE real no esta implementada...'
    );
  }

  // ... logica del mock determinista
}
```

Para implementar el modo real, reemplazar el `throw` con la llamada al SDK del proveedor PSE:

```typescript
processPayment(dto: PseMockRequestDto) {
  if (this.mode === 'real') {
    // TODO: Integrar con pasarela PSE real aqui
    // Ejemplo generico:
    // const result = await this.psePaymentGateway.createTransaction({
    //   bank: dto.bankCode,
    //   documentType: dto.documentType,
    //   documentNumber: dto.documentNumber,
    //   amount: dto.amount,
    //   holder: dto.fullName,
    //   returnUrl: config.PSE_RETURN_URL,
    // });
    // return {
    //   transactionId: result.id,
    //   status: result.status,
    //   message: result.message,
    //   bankName: BANK_DISPLAY_NAMES[dto.bankCode],
    //   timestamp: new Date(),
    // };
    throw new NotImplementedException(...);
  }

  // ... logica del mock (sin cambios)
}
```

**Consideraciones al implementar real:**

1. **Async/await:** El metodo actual es sincrono. Cuando se integre el SDK real, cambiar a `async` y actualizar las firmas de los callers.
2. **Variables de entorno adicionales:** Agregar al `env.validation.ts` las credenciales del proveedor (`PSE_API_KEY`, `PSE_RETURN_URL`, etc.).
3. **Webhook de confirmacion:** PSE real es asincrono — el usuario paga en su banco y PSE notifica via webhook. Puede requerir un endpoint adicional `POST /pse/webhook` que actualice el estado de la transaccion.
4. **Renombrar servicio:** Eventualmente conviene renombrar `PseMockService` → `PseService` para reflejar que ya no es solo mock. Por ahora se mantiene el nombre por backwards compatibility.

---

## Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `src/config/env.validation.ts` | Declara `PSE_MODE` con validacion |
| `src/tenant-payments/pse-mock/pse-mock.service.ts` | Logica del servicio (mock + gate para real) |
| `src/tenant-payments/tenant-payments.module.ts` | Exporta `PseMockService` para otros modulos |
| `.env.example` | Documentacion de la variable |
| `.env` (local/staging/prod) | Valor efectivo por ambiente |

---

## Uso por ambiente recomendado

| Ambiente | PSE_MODE | Razon |
|----------|----------|-------|
| Desarrollo local | `mock` | No requiere conexion al proveedor PSE |
| Testing/CI | `mock` | Resultados deterministas para tests automaticos |
| Staging | `mock` (por ahora) | Usar `real` cuando se implemente con sandbox del proveedor |
| Produccion | `mock` (por ahora) | Cambiar a `real` cuando la pasarela real este integrada |

---

*Documentado: 2026-04-05 — Feature flag para PSE real/mock*
