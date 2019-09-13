import {
  SerializedSyncProtocolTransaction,
  SyncProtocolUnsignedTransactionKeys,
  UnsignedTransaction,
  UnsignedTransactionSerializer
} from '../unsigned-transaction.serializer'
import { toBuffer } from '../utils/toBuffer'
import BigNumber from 'bignumber.js'

export type SerializedUnsignedCosmosTransaction = [[[Buffer, Buffer, [[Buffer, Buffer]]]], [[[Buffer, Buffer]], Buffer], Buffer, Buffer]

export class RawCosmosTransaction {
  public messages: RawCosmosSendMessage[]
  public fee: RawCosmosFee
  public memo: string
  public chainID: string

  constructor(messages: RawCosmosSendMessage[], fee: RawCosmosFee, memo: string, chainID: string) {
    this.messages = messages
    this.fee = fee
    this.memo = memo
    this.chainID = chainID
  }

  toSignJSON(accountNumber: number, sequence: number): any {
    return {
      accountNumber: accountNumber,
      chain_id: this.chainID,
      fee: this.fee.toSignJSON(),
      memo: this.memo,
      msgs: this.messages.map(value => value.toSignJSON()),
      sequence: sequence
    }
  }
}

export class RawCosmosSendMessage {
  public fromAddress: string
  public toAddress: string
  public coins: RawCosmosCoin[]

  constructor(fromAddress: string, toAddress: string, coins: RawCosmosCoin[]) {
    this.fromAddress = fromAddress
    this.toAddress = toAddress
    this.coins = coins
  }

  toSignJSON(): any {
    return {
      type: 'cosmos-sdk/MsgSend',
      value: {
        amount: this.coins.map(value => value.toSignJSON()),
        from_address: this.fromAddress,
        to_address: this.toAddress
      }
    }
  }
}

export class RawCosmosCoin {
  public denom: string
  public amount: BigNumber

  constructor(denom: string, amount: BigNumber) {
    this.denom = denom
    this.amount = amount
  }

  toSignJSON(): any {
    return {
      amount: this.amount.toFixed(),
      denom: this.denom
    }
  }
}

export class RawCosmosFee {
  public amount: RawCosmosCoin[]
  public gas: BigNumber

  constructor(amount: RawCosmosCoin[], gas: BigNumber) {
    this.amount = amount
    this.gas = gas
  }

  toSignJSON(): any {
    return {
      amount: this.amount.map(value => value.toSignJSON()),
      gas: this.gas.toFixed()
    }
  }
}

export interface UnsignedCosmosTransaction extends UnsignedTransaction {
  transaction: RawCosmosTransaction
}

export class CosmosTransactionSerializer extends UnsignedTransactionSerializer {
  public serialize(unsignedTx: UnsignedCosmosTransaction): SerializedSyncProtocolTransaction {
    const serialized = [
      [
        [
          ...unsignedTx.transaction.messages.map(message => [
            message.fromAddress,
            message.toAddress,
            [
              ...message.coins.map(coin => {
                ;[coin.denom, coin.amount]
              })
            ]
          ])
        ],
        [[...unsignedTx.transaction.fee.amount.map(amount => [amount.denom, amount.amount])], unsignedTx.transaction.fee.gas],
        unsignedTx.transaction.memo,
        unsignedTx.transaction.chainID
      ],
      unsignedTx.publicKey, // publicKey
      unsignedTx.callback ? unsignedTx.callback : 'airgap-wallet://?d=' // callback-scheme
    ]
    return toBuffer(serialized) as SerializedSyncProtocolTransaction
  }

  public deserialize(serializedTx: SerializedSyncProtocolTransaction): UnsignedCosmosTransaction {
    const cosmosTx = serializedTx[SyncProtocolUnsignedTransactionKeys.UNSIGNED_TRANSACTION] as SerializedUnsignedCosmosTransaction
    const messages = cosmosTx[0]
    const fee = cosmosTx[1]
    const memo = cosmosTx[2]
    const chainID = cosmosTx[3]

    const rawCosmosTx = new RawCosmosTransaction(
      messages.map(
        message =>
          new RawCosmosSendMessage(
            message[0].toString(),
            message[1].toString(),
            message[2].map(coin => new RawCosmosCoin(coin[0].toString(), new BigNumber(coin[1].toString())))
          )
      ),
      new RawCosmosFee(
        fee[0].map(amount => new RawCosmosCoin(amount[0].toString(), new BigNumber(amount[1].toString()))),
        new BigNumber(fee[1].toString())
      ),
      memo.toString(),
      chainID.toString()
    )
    return {
      transaction: rawCosmosTx,
      publicKey: serializedTx[SyncProtocolUnsignedTransactionKeys.PUBLIC_KEY].toString(),
      callback: serializedTx[SyncProtocolUnsignedTransactionKeys.CALLBACK].toString()
    }
  }
}
