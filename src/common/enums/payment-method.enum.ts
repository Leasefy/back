/**
 * Payment methods for Colombian rental payments
 * PSE: Pagos Seguros en Linea (bank transfer via PSE network)
 * BANK_TRANSFER: Direct bank transfer (transferencia bancaria)
 * CASH: Cash payment (efectivo)
 * NEQUI: Nequi digital wallet (Bancolombia)
 * DAVIPLATA: Daviplata digital wallet (Davivienda)
 * CHECK: Check payment (cheque)
 */
export enum PaymentMethod {
  PSE = 'PSE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  CHECK = 'CHECK',
}
