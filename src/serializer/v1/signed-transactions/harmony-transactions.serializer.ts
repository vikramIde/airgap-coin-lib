import {
  SerializedSyncProtocolSignedTransaction,
  SignedTransaction,
  SignedTransactionSerializer,
  SyncProtocolSignedTransactionKeys
} from '../signed-transaction.serializer'
import { toBuffer } from '../utils/toBuffer'

export type SerializedSignedHarmonyTransaction = [Buffer]

export interface SignedHarmonyTransaction extends SignedTransaction {
  accountIdentifier: string
  transaction: string
}

export class HarmonySignedTransactionSerializer extends SignedTransactionSerializer {
  public serialize(transaction: SignedHarmonyTransaction): SerializedSyncProtocolSignedTransaction {
    const toSerialize: any[] = []

    toSerialize[SyncProtocolSignedTransactionKeys.ACCOUNT_IDENTIFIER] = transaction.accountIdentifier
    toSerialize[SyncProtocolSignedTransactionKeys.SIGNED_TRANSACTION] = transaction.transaction

    const serializedBuffer: SerializedSyncProtocolSignedTransaction = toBuffer(toSerialize) as SerializedSyncProtocolSignedTransaction

    return serializedBuffer
  }

  public deserialize(serializedTx: SerializedSyncProtocolSignedTransaction): SignedHarmonyTransaction {
    return {
      accountIdentifier: serializedTx[SyncProtocolSignedTransactionKeys.ACCOUNT_IDENTIFIER].toString(),
      transaction: serializedTx[SyncProtocolSignedTransactionKeys.SIGNED_TRANSACTION].toString()
    }
  }
}
