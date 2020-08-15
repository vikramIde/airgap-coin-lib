import { IAirGapTransaction } from '../../interfaces/IAirGapTransaction'

export interface HarmonyTransactionCursor {
    offset: number
}

export interface HarmonyTransactionResult {
    transactions: IAirGapTransaction[]
    cursor: HarmonyTransactionCursor
}
