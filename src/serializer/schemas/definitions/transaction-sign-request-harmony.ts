import { UnsignedTransaction } from './transaction-sign-request'

interface RawHarmonyTransaction {
  networkId: string
  transaction: string
}

export interface UnsignedHarmonyTransaction extends UnsignedTransaction {
  transaction: RawHarmonyTransaction
}
