/**
 * Account type for bank accounts.
 * Used for landlord payment method configuration.
 *
 * AHORROS: Savings account (Cuenta de Ahorros)
 * CORRIENTE: Checking account (Cuenta Corriente)
 */
export enum AccountType {
  /** Cuenta de Ahorros (Savings Account) */
  AHORROS = 'AHORROS',

  /** Cuenta Corriente (Checking Account) */
  CORRIENTE = 'CORRIENTE',
}

/**
 * Display names for account types in Spanish.
 */
export const ACCOUNT_TYPE_DISPLAY: Record<AccountType, string> = {
  [AccountType.AHORROS]: 'Cuenta de Ahorros',
  [AccountType.CORRIENTE]: 'Cuenta Corriente',
};
