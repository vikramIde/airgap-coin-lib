import { SignedTransaction } from './transaction-sign-response'

export interface SignedHarmonyTransaction extends SignedTransaction {
  accountIdentifier: string
  transaction: string
}
