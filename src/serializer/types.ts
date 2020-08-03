import { CosmosTransaction } from '../protocols/cosmos/CosmosTransaction'

import { UnsignedTransaction } from './schemas/definitions/transaction-sign-request'

export interface RawTezosTransaction {
  binaryTransaction: string
}

export interface RawEthereumTransaction {
  nonce: string
  gasPrice: string
  gasLimit: string
  to: string
  value: string
  chainId: number
  data: string
}

export interface RawHarmonyTransaction {
  //  token send to
  to: string
  // amount to send
  value: string
  // gas limit, you can use string or use BN value
  gasLimit: string
  // send token from shardID
  shardID: string
  // send token to toShardID
  toShardID: string
  // gas Price, you can use Unit class, and use Gwei, then remember to use toWei(), which will be transformed to BN
  gasPrice: string
  // if you set nonce manually here, and remember, the `updateNonce` of `Account.signTransaction` should be set to false
  nonce: string
}

export interface IInTransaction {
  txId: string
  value: string
  vout: number
  address: string
  derivationPath?: string
}

export interface IOutTransaction {
  recipient: string
  isChange: boolean
  value: string
  derivationPath?: string
}

export interface RawBitcoinTransaction {
  ins: IInTransaction[]
  outs: IOutTransaction[]
}

export interface RawAeternityTransaction {
  networkId: string
  transaction: string
}

export interface UnsignedCosmosTransaction extends UnsignedTransaction {
  transaction: CosmosTransaction
}

export interface RawSubstrateTransaction {
  encoded: string
}
