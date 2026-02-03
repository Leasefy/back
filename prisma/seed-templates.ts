import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Template definitions for all 19 notification events.
 * Spanish language for Colombian market.
 */
const templates = [
  // ===== APPLICATIONS (4) =====
  {
    code: 'APPLICATION_RECEIVED',
    name: 'Nueva aplicacion recibida',
    description: 'Sent to landlord when tenant submits an application',
    emailSubject: 'Nueva aplicacion para {{propertyTitle}}',
    emailBody: `# Nueva Aplicacion Recibida

Hola {{userName}},

**{{otherPartyName}}** ha enviado una aplicacion para tu propiedad **{{propertyTitle}}**.

## Detalles
- **Propiedad:** {{propertyTitle}}
- **Direccion:** {{propertyAddress}}
- **Aplicante:** {{otherPartyName}}

Por favor revisa la aplicacion y el puntaje de riesgo en tu panel de control.

[Ver Aplicacion](https://arriendofacil.co/landlord/applications)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Nueva aplicacion',
    pushBody: '{{otherPartyName}} aplico a {{propertyTitle}}',
  },
  {
    code: 'APPLICATION_APPROVED',
    name: 'Aplicacion aprobada',
    description: 'Sent to tenant when landlord approves their application',
    emailSubject: 'Tu aplicacion fue aprobada - {{propertyTitle}}',
    emailBody: `# Felicitaciones!

Hola {{userName}},

Tu aplicacion para **{{propertyTitle}}** ha sido **aprobada**.

## Siguientes pasos
1. Revisa los terminos del contrato
2. Firma digitalmente el contrato
3. Coordina la entrega de llaves

El propietario se pondra en contacto contigo pronto para finalizar los detalles.

[Ver Contrato](https://arriendofacil.co/tenant/contracts)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Aplicacion aprobada',
    pushBody: 'Tu aplicacion para {{propertyTitle}} fue aprobada',
  },
  {
    code: 'APPLICATION_REJECTED',
    name: 'Aplicacion rechazada',
    description: 'Sent to tenant when landlord rejects their application',
    emailSubject: 'Actualizacion sobre tu aplicacion - {{propertyTitle}}',
    emailBody: `# Actualizacion de Aplicacion

Hola {{userName}},

Lamentamos informarte que tu aplicacion para **{{propertyTitle}}** no fue aprobada en esta ocasion.

No te desanimes - hay muchas otras propiedades disponibles que pueden ser perfectas para ti.

[Explorar Propiedades](https://arriendofacil.co/properties)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Aplicacion actualizada',
    pushBody: 'Tu aplicacion para {{propertyTitle}} no fue aprobada',
  },
  {
    code: 'APPLICATION_INFO_REQUESTED',
    name: 'Informacion adicional solicitada',
    description: 'Sent to tenant when landlord requests more info',
    emailSubject: 'Se requiere informacion adicional - {{propertyTitle}}',
    emailBody: `# Informacion Adicional Requerida

Hola {{userName}},

El propietario de **{{propertyTitle}}** ha solicitado informacion adicional para procesar tu aplicacion.

Por favor revisa tu aplicacion y proporciona la documentacion o informacion solicitada.

[Completar Aplicacion](https://arriendofacil.co/tenant/applications)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Info requerida',
    pushBody: 'Se solicita info adicional para {{propertyTitle}}',
  },

  // ===== PAYMENTS (6) =====
  {
    code: 'PAYMENT_RECEIPT_UPLOADED',
    name: 'Comprobante de pago subido',
    description: 'Sent to landlord when tenant uploads payment receipt',
    emailSubject: 'Nuevo comprobante de pago - {{propertyTitle}}',
    emailBody: `# Comprobante de Pago Recibido

Hola {{userName}},

**{{otherPartyName}}** ha subido un comprobante de pago para **{{propertyTitle}}**.

## Detalles
- **Monto:** {{amount}}
- **Fecha:** {{date}}

Por favor revisa el comprobante y aprueba o rechaza el pago.

[Revisar Pago](https://arriendofacil.co/landlord/payments)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Comprobante recibido',
    pushBody: '{{otherPartyName}} envio comprobante de {{amount}}',
  },
  {
    code: 'PAYMENT_APPROVED',
    name: 'Pago aprobado',
    description: 'Sent to tenant when landlord approves payment',
    emailSubject: 'Pago aprobado - {{propertyTitle}}',
    emailBody: `# Pago Aprobado

Hola {{userName}},

Tu pago para **{{propertyTitle}}** ha sido aprobado.

## Detalles
- **Monto:** {{amount}}
- **Fecha:** {{date}}

Gracias por tu pago puntual.

[Ver Historial](https://arriendofacil.co/tenant/payments)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Pago aprobado',
    pushBody: 'Tu pago de {{amount}} fue aprobado',
  },
  {
    code: 'PAYMENT_REJECTED',
    name: 'Pago rechazado',
    description: 'Sent to tenant when landlord rejects payment',
    emailSubject: 'Pago rechazado - {{propertyTitle}}',
    emailBody: `# Pago Rechazado

Hola {{userName}},

Tu pago para **{{propertyTitle}}** ha sido rechazado por el propietario.

## Detalles
- **Monto:** {{amount}}
- **Fecha:** {{date}}

Por favor revisa el motivo del rechazo y sube un nuevo comprobante si es necesario. Si no estas de acuerdo, puedes abrir una disputa.

[Ver Detalles](https://arriendofacil.co/tenant/payments)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Pago rechazado',
    pushBody: 'Tu pago de {{amount}} fue rechazado',
  },
  {
    code: 'PAYMENT_DISPUTE_OPENED',
    name: 'Disputa de pago abierta',
    description: 'Sent to landlord and support when tenant opens dispute',
    emailSubject: 'Nueva disputa de pago - {{propertyTitle}}',
    emailBody: `# Disputa de Pago Abierta

Hola {{userName}},

Se ha abierto una disputa de pago para **{{propertyTitle}}**.

## Detalles
- **Inquilino:** {{otherPartyName}}
- **Monto:** {{amount}}
- **Fecha:** {{date}}

Nuestro equipo de soporte revisara el caso y se comunicara con ambas partes.

[Ver Disputa](https://arriendofacil.co/payments/disputes)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Disputa abierta',
    pushBody: 'Disputa de pago para {{propertyTitle}}',
  },
  {
    code: 'PAYMENT_REMINDER',
    name: 'Recordatorio de pago',
    description: 'Sent to tenant when payment is due soon',
    emailSubject: 'Recordatorio: Pago proximo - {{propertyTitle}}',
    emailBody: `# Recordatorio de Pago

Hola {{userName}},

Este es un recordatorio amigable de que tu pago de arriendo para **{{propertyTitle}}** vence pronto.

## Detalles
- **Monto:** {{amount}}
- **Fecha de vencimiento:** {{date}}

Por favor realiza tu pago a tiempo para mantener tu buen historial.

[Realizar Pago](https://arriendofacil.co/tenant/payments)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Pago proximo',
    pushBody: 'Pago de {{amount}} vence el {{date}}',
  },
  {
    code: 'PAYMENT_OVERDUE',
    name: 'Pago atrasado',
    description: 'Sent to landlord and tenant when payment is overdue',
    emailSubject: 'Alerta: Pago atrasado - {{propertyTitle}}',
    emailBody: `# Pago Atrasado

Hola {{userName}},

El pago de arriendo para **{{propertyTitle}}** esta atrasado.

## Detalles
- **Monto:** {{amount}}
- **Fecha de vencimiento:** {{date}}

Por favor regulariza tu situacion lo antes posible.

[Ver Pagos](https://arriendofacil.co/payments)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Pago atrasado',
    pushBody: 'Pago de {{amount}} esta atrasado',
  },

  // ===== VISITS (6) =====
  {
    code: 'VISIT_REQUESTED',
    name: 'Solicitud de visita',
    description: 'Sent to landlord when tenant requests a visit',
    emailSubject: 'Nueva solicitud de visita - {{propertyTitle}}',
    emailBody: `# Nueva Solicitud de Visita

Hola {{userName}},

**{{otherPartyName}}** desea visitar tu propiedad **{{propertyTitle}}**.

## Detalles
- **Fecha:** {{date}}
- **Direccion:** {{propertyAddress}}

Por favor acepta o rechaza la solicitud.

[Ver Solicitud](https://arriendofacil.co/landlord/visits)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Solicitud de visita',
    pushBody: '{{otherPartyName}} quiere visitar {{propertyTitle}}',
  },
  {
    code: 'VISIT_ACCEPTED',
    name: 'Visita aceptada',
    description: 'Sent to tenant when landlord accepts visit',
    emailSubject: 'Visita confirmada - {{propertyTitle}}',
    emailBody: `# Visita Confirmada

Hola {{userName}},

Tu solicitud de visita para **{{propertyTitle}}** ha sido confirmada.

## Detalles
- **Fecha:** {{date}}
- **Direccion:** {{propertyAddress}}

Por favor llega puntual. El propietario te estara esperando.

[Ver Detalles](https://arriendofacil.co/tenant/visits)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Visita confirmada',
    pushBody: 'Visita a {{propertyTitle}} confirmada para {{date}}',
  },
  {
    code: 'VISIT_REJECTED',
    name: 'Visita rechazada',
    description: 'Sent to tenant when landlord rejects visit',
    emailSubject: 'Solicitud de visita no disponible - {{propertyTitle}}',
    emailBody: `# Visita No Disponible

Hola {{userName}},

Lamentamos informarte que tu solicitud de visita para **{{propertyTitle}}** no pudo ser aceptada.

Puedes intentar agendar otra fecha disponible.

[Buscar Horarios](https://arriendofacil.co/properties)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Visita no disponible',
    pushBody: 'Tu visita a {{propertyTitle}} no fue aceptada',
  },
  {
    code: 'VISIT_CANCELLED',
    name: 'Visita cancelada',
    description: 'Sent to other party when visit is cancelled',
    emailSubject: 'Visita cancelada - {{propertyTitle}}',
    emailBody: `# Visita Cancelada

Hola {{userName}},

La visita programada para **{{propertyTitle}}** ha sido cancelada.

## Detalles
- **Fecha original:** {{date}}
- **Cancelado por:** {{otherPartyName}}

Puedes reagendar la visita si lo deseas.

[Reagendar](https://arriendofacil.co/visits)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Visita cancelada',
    pushBody: 'Visita a {{propertyTitle}} fue cancelada',
  },
  {
    code: 'VISIT_RESCHEDULED',
    name: 'Visita reprogramada',
    description: 'Sent to other party when visit is rescheduled',
    emailSubject: 'Visita reprogramada - {{propertyTitle}}',
    emailBody: `# Visita Reprogramada

Hola {{userName}},

La visita para **{{propertyTitle}}** ha sido reprogramada.

## Nueva Fecha
- **Fecha:** {{date}}
- **Direccion:** {{propertyAddress}}

Por favor confirma tu disponibilidad.

[Ver Detalles](https://arriendofacil.co/visits)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Visita reprogramada',
    pushBody: 'Visita a {{propertyTitle}} movida a {{date}}',
  },
  {
    code: 'VISIT_REMINDER_24H',
    name: 'Recordatorio de visita (24h)',
    description: 'Sent to both parties 24 hours before visit',
    emailSubject: 'Recordatorio: Visita manana - {{propertyTitle}}',
    emailBody: `# Recordatorio de Visita

Hola {{userName}},

Este es un recordatorio de que tienes una visita programada para manana.

## Detalles
- **Propiedad:** {{propertyTitle}}
- **Fecha:** {{date}}
- **Direccion:** {{propertyAddress}}

Por favor llega puntual.

[Ver Detalles](https://arriendofacil.co/visits)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Visita manana',
    pushBody: 'Recuerda: visita a {{propertyTitle}} manana',
  },

  // ===== CONTRACTS (4) =====
  {
    code: 'CONTRACT_READY_TO_SIGN',
    name: 'Contrato listo para firmar',
    description: 'Sent to tenant when contract is ready',
    emailSubject: 'Contrato listo para firmar - {{propertyTitle}}',
    emailBody: `# Contrato Listo para Firmar

Hola {{userName}},

Tu contrato de arrendamiento para **{{propertyTitle}}** esta listo para ser firmado.

## Detalles
- **Propiedad:** {{propertyTitle}}
- **Direccion:** {{propertyAddress}}

Por favor revisa los terminos y firma digitalmente.

[Firmar Contrato](https://arriendofacil.co/tenant/contracts)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Contrato listo',
    pushBody: 'Tu contrato para {{propertyTitle}} esta listo',
  },
  {
    code: 'CONTRACT_LANDLORD_SIGNED',
    name: 'Propietario firmo contrato',
    description: 'Sent to tenant when landlord signs',
    emailSubject: 'El propietario firmo el contrato - {{propertyTitle}}',
    emailBody: `# Propietario Firmo el Contrato

Hola {{userName}},

**{{otherPartyName}}** ha firmado el contrato de arrendamiento para **{{propertyTitle}}**.

Solo falta tu firma para completar el proceso.

[Firmar Ahora](https://arriendofacil.co/tenant/contracts)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Firma pendiente',
    pushBody: 'Propietario firmo, falta tu firma',
  },
  {
    code: 'CONTRACT_TENANT_SIGNED',
    name: 'Inquilino firmo contrato',
    description: 'Sent to landlord when tenant signs',
    emailSubject: 'El inquilino firmo el contrato - {{propertyTitle}}',
    emailBody: `# Inquilino Firmo el Contrato

Hola {{userName}},

**{{otherPartyName}}** ha firmado el contrato de arrendamiento para **{{propertyTitle}}**.

Solo falta tu firma para completar el proceso.

[Firmar Ahora](https://arriendofacil.co/landlord/contracts)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Firma pendiente',
    pushBody: 'Inquilino firmo, falta tu firma',
  },
  {
    code: 'CONTRACT_COMPLETED',
    name: 'Contrato completado',
    description: 'Sent to both parties when contract is fully signed',
    emailSubject: 'Contrato firmado completamente - {{propertyTitle}}',
    emailBody: `# Contrato Completado

Hola {{userName}},

El contrato de arrendamiento para **{{propertyTitle}}** ha sido firmado por ambas partes.

El contrato entrara en vigencia en la fecha de inicio acordada.

[Descargar Contrato](https://arriendofacil.co/contracts)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Contrato firmado',
    pushBody: 'Contrato de {{propertyTitle}} completado',
  },

  // ===== LEASES (2) =====
  {
    code: 'LEASE_EXPIRING_SOON',
    name: 'Contrato proximo a vencer',
    description: 'Sent to both parties 30 days before lease ends',
    emailSubject: 'Tu contrato vence pronto - {{propertyTitle}}',
    emailBody: `# Contrato Proximo a Vencer

Hola {{userName}},

Tu contrato de arrendamiento para **{{propertyTitle}}** vencera el **{{date}}**.

## Opciones
1. Renovar el contrato con el propietario
2. Preparar la devolucion del inmueble

Por favor contacta a la otra parte para discutir los siguientes pasos.

[Ver Contrato](https://arriendofacil.co/leases)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Contrato vence pronto',
    pushBody: 'Tu contrato de {{propertyTitle}} vence el {{date}}',
  },
  {
    code: 'LEASE_EXPIRED',
    name: 'Contrato vencido',
    description: 'Sent to both parties when lease expires',
    emailSubject: 'Contrato vencido - {{propertyTitle}}',
    emailBody: `# Contrato Vencido

Hola {{userName}},

Tu contrato de arrendamiento para **{{propertyTitle}}** ha vencido.

Si continuas ocupando el inmueble, por favor regulariza tu situacion con el propietario.

[Ver Opciones](https://arriendofacil.co/leases)

Saludos,
Equipo Arriendo Facil`,
    pushTitle: 'Contrato vencido',
    pushBody: 'Tu contrato de {{propertyTitle}} ha vencido',
  },
];

/**
 * Seed default notification templates.
 * Uses upsert to allow re-running without duplicates.
 */
async function main() {
  console.log('Seeding notification templates...');

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { code: template.code },
      update: {
        name: template.name,
        description: template.description,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
        pushTitle: template.pushTitle,
        pushBody: template.pushBody,
      },
      create: {
        code: template.code,
        name: template.name,
        description: template.description,
        emailSubject: template.emailSubject,
        emailBody: template.emailBody,
        pushTitle: template.pushTitle,
        pushBody: template.pushBody,
        isActive: true,
      },
    });
    console.log(`  - ${template.code}`);
  }

  console.log(`\nSeeded ${templates.length} notification templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
