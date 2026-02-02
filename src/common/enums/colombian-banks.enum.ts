/**
 * Colombian banks for PSE mock and landlord payment methods.
 * Source: PSE Colombia bank list
 */
export enum ColombianBank {
  // Major banks
  BANCOLOMBIA = 'BANCOLOMBIA',
  DAVIVIENDA = 'DAVIVIENDA',
  BBVA = 'BBVA',
  BANCO_BOGOTA = 'BANCO_BOGOTA',
  BANCO_OCCIDENTE = 'BANCO_OCCIDENTE',
  BANCO_POPULAR = 'BANCO_POPULAR',
  BANCO_AV_VILLAS = 'BANCO_AV_VILLAS',
  BANCO_CAJA_SOCIAL = 'BANCO_CAJA_SOCIAL',

  // Digital wallets (for PSE)
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',

  // Other banks
  SCOTIABANK = 'SCOTIABANK',
  ITAU = 'ITAU',
  BANCOOMEVA = 'BANCOOMEVA',
  BANCO_FALABELLA = 'BANCO_FALABELLA',
  BANCO_PICHINCHA = 'BANCO_PICHINCHA',
}

/**
 * Display names for Colombian banks in Spanish.
 */
export const BANK_DISPLAY_NAMES: Record<ColombianBank, string> = {
  [ColombianBank.BANCOLOMBIA]: 'Bancolombia',
  [ColombianBank.DAVIVIENDA]: 'Davivienda',
  [ColombianBank.BBVA]: 'BBVA Colombia',
  [ColombianBank.BANCO_BOGOTA]: 'Banco de Bogota',
  [ColombianBank.BANCO_OCCIDENTE]: 'Banco de Occidente',
  [ColombianBank.BANCO_POPULAR]: 'Banco Popular',
  [ColombianBank.BANCO_AV_VILLAS]: 'Banco AV Villas',
  [ColombianBank.BANCO_CAJA_SOCIAL]: 'Banco Caja Social',
  [ColombianBank.NEQUI]: 'Nequi',
  [ColombianBank.DAVIPLATA]: 'Daviplata',
  [ColombianBank.SCOTIABANK]: 'Scotiabank Colpatria',
  [ColombianBank.ITAU]: 'Itau',
  [ColombianBank.BANCOOMEVA]: 'Bancoomeva',
  [ColombianBank.BANCO_FALABELLA]: 'Banco Falabella',
  [ColombianBank.BANCO_PICHINCHA]: 'Banco Pichincha',
};
