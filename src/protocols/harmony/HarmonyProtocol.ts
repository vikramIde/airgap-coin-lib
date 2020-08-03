import * as sodium from 'libsodium-wrappers'
import { KeyPair } from '../../data/KeyPair'
import axios from '../../dependencies/src/axios-0.19.0/index'
import BigNumber from '../../dependencies/src/bignumber.js-9.0.0/bignumber'
import { mnemonicToSeed, validateMnemonic } from '../../dependencies/src/bip39-2.5.0/index'
import * as bs58check from '../../dependencies/src/bs58check-2.1.2/index'
import SECP256K1 = require('../../dependencies/src/secp256k1-3.7.1/elliptic')
import { BIP32Interface, fromSeed } from '../../dependencies/src/bip32-2.0.4/src/index'
// const { Harmony } = require('@harmony-js/core');
// const { ChainID, ChainType } = require('@harmony-js/utils');
import * as rlp from '../../dependencies/src/rlp-2.2.3/index'
import { IAirGapSignedTransaction } from '../../interfaces/IAirGapSignedTransaction'
import { AirGapTransactionStatus, IAirGapTransaction } from '../../interfaces/IAirGapTransaction'
import { UnsignedAeternityTransaction } from '../../serializer/schemas/definitions/transaction-sign-request-aeternity'
import { SignedAeternityTransaction } from '../../serializer/schemas/definitions/transaction-sign-response-aeternity'
import { RawHarmonyTransaction } from '../../serializer/types'
import bs64check from '../../utils/base64Check'
import { padStart } from '../../utils/padStart'
import { MainProtocolSymbols, ProtocolSymbols } from '../../utils/ProtocolSymbols'
import { EthereumUtils } from '../ethereum/utils/utils'
import { CurrencyUnit, FeeDefaults, ICoinProtocol } from '../ICoinProtocol'
import { NonExtendedProtocol } from '../NonExtendedProtocol'
import { HarmonyCryptoClient } from './HarmonyCryptoClient'

import { HarmonyProtocolOptions } from './HarmonyProtocolOptions'
import { TransactionListQuery } from './CosmosTransactionListQuery'

export class AeternityProtocol extends NonExtendedProtocol implements ICoinProtocol {
  public symbol: string = 'ONE'
  public name: string = 'harmony'
  public marketSymbol: string = 'one'

  public feeSymbol: string = 'one'

  public decimals: number = 18
  public feeDecimals: number = 18
  public identifier: ProtocolSymbols = MainProtocolSymbols.ONE

  public feeDefaults = {
    low: '0.000021',
    medium: '0.000042',
    high: '0.000084'
  }

  public units: CurrencyUnit[] = [
    {
      unitSymbol: 'ONE',
      factor: '1'
    },
    {
      unitSymbol: 'GWEI',
      factor: '0.000000001'
    },
    {
      unitSymbol: 'WEI',
      factor: '0.000000000000000001'
    }
  ]

  public supportsHD: boolean = false
  public standardDerivationPath: string = `m/44'/1023'/0'/0/`

  public addressIsCaseSensitive: boolean = true
  public addressValidationPattern: string = '^one1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$'
  public addressPlaceholder: string = 'one1_abc...'

  // ae specifics
  public defaultNetworkId: string = '0'

  private readonly feesURL: string = 'https://api-airgap.gke.papers.tech/fees'

  constructor(public readonly options: HarmonyProtocolOptions = new HarmonyProtocolOptions()) {
    super()
  }

  public async getBlockExplorerLinkForAddress(address: string): Promise<string> {
    return this.options.network.blockExplorer.getAddressLink(address)
  }

  public async getBlockExplorerLinkForTxId(txId: string): Promise<string> {
    return this.options.network.blockExplorer.getTransactionLink(txId)
  }

  public generateKeyPair(mnemonic: string, derivationPath: string = this.standardDerivationPath, password?: string): KeyPair {
    validateMnemonic(mnemonic)
    const seed = mnemonicToSeed(mnemonic, password)
    const node = fromSeed(seed)

    return this.generateKeyPairFromNode(node, derivationPath)
  }

  private generateKeyPairFromNode(node: BIP32Interface, derivationPath: string): KeyPair {
    const keys = node.derivePath(derivationPath)
    const privateKey = keys.privateKey
    if (privateKey === undefined) {
      throw new Error('Cannot generate private key')
    }

    return {
      publicKey: keys.publicKey,
      privateKey
    }
  }

  public async getPublicKeyFromMnemonic(mnemonic: string, derivationPath: string, password?: string): Promise<string> {
    return this.generateKeyPair(mnemonic, derivationPath, password).publicKey.toString('hex')
  }

  public async getPrivateKeyFromMnemonic(mnemonic: string, derivationPath: string, password?: string): Promise<Buffer> {
    return this.generateKeyPair(mnemonic, derivationPath, password).privateKey
  }


  public async getPublicKeyFromHexSecret(secret: string, derivationPath: string): Promise<string> {
    const node: BIP32Interface = fromSeed(Buffer.from(secret, 'hex'))

    return this.generateKeyPairFromNode(node, derivationPath).publicKey.toString('hex')
  }

  public getPublicKeyFromPrivateKey(privateKey: Buffer): Buffer {
    const publicKey = SECP256K1.publicKeyCreate(privateKey)

    return Buffer.from(publicKey, 'binary')
  }

  public async getPrivateKeyFromHexSecret(secret: string, derivationPath: string): Promise<Buffer> {
    const node = fromSeed(Buffer.from(secret, 'hex'))

    return this.generateKeyPairFromNode(node, derivationPath).privateKey
  }

  public async getAddressFromPublicKey(publicKey: string): Promise<string> {
    const base58 = bs58check.encode(Buffer.from(publicKey, 'hex'))

    return `one1_${base58}`
  }

  public async getAddressesFromPublicKey(publicKey: string): Promise<string[]> {
    const address = await this.getAddressFromPublicKey(publicKey)

    return [address]
  }

  public async getTransactionsFromPublicKey(publicKey: string, limit: number, offset: number): Promise<IAirGapTransaction[]> {
    return this.getTransactionsFromAddresses([await this.getAddressFromPublicKey(publicKey)], limit, offset)
  }

  public async getTransactionsFromAddresses(addresses: string[], limit: number, offset: number): Promise<IAirGapTransaction[]> {
    const allTransactions = await Promise.all(
      addresses.map((address) => {
        return axios.get(`${this.options.network.rpcUrl}/middleware/transactions/account/${address}`)
      })
    )

    const transactions: any[] = [].concat(
      ...allTransactions.map((axiosData) => {
        return axiosData.data || []
      })
    )

    return transactions.map((obj) => {
      const parsedTimestamp = parseInt(obj.time, 10)
      const airGapTx: IAirGapTransaction = {
        amount: new BigNumber(obj.tx.amount).toString(10),
        fee: new BigNumber(obj.tx.fee).toString(10),
        from: [obj.tx.sender_id],
        isInbound: addresses.indexOf(obj.tx.recipient_id) !== -1,
        protocolIdentifier: this.identifier,
        network: this.options.network,
        to: [obj.tx.recipient_id],
        hash: obj.hash,
        blockHeight: obj.block_height
      }

      if (obj.tx.payload) {
        airGapTx.data = obj.tx.payload
      }

      if (!isNaN(parsedTimestamp)) {
        airGapTx.timestamp = Math.round(parsedTimestamp / 1000)
      }

      return airGapTx
    })
  }

  public async signWithPrivateKey(privateKey: Buffer, transaction: RawHarmonyTransaction): Promise<IAirGapSignedTransaction> {
    // sign and cut off first byte ('ae')
    const rawTx = this.decodeTx(transaction.transaction)

    await sodium.ready
    const signature = sodium.crypto_sign_detached(Buffer.concat([Buffer.from(transaction.networkId), rawTx]), privateKey)

    const txObj = {
      tag: this.toHexBuffer(11),
      version: this.toHexBuffer(1),
      signatures: [Buffer.from(signature)],
      transaction: rawTx
    }

    const txArray = Object.keys(txObj).map((a) => txObj[a])

    const rlpEncodedTx = rlp.encode(txArray)
    const signedEncodedTx = `tx_${bs64check.encode(rlpEncodedTx)}`

    return signedEncodedTx
  }

  private decodeTx(transaction: string): any {
    let rawTx: any

    try {
      rawTx = bs64check.decode(transaction.replace('tx_', ''))

      return rawTx
    } catch (error) {
      //
    }

    try {
      rawTx = bs58check.decode(transaction.replace('tx_', ''))

      return rawTx
    } catch (error) {
      //
    }

    throw new Error('invalid TX-encoding')
  }

  public async getTransactionDetails(unsignedTx: UnsignedAeternityTransaction): Promise<IAirGapTransaction[]> {
    const transaction = unsignedTx.transaction.transaction
    const rlpEncodedTx = this.decodeTx(transaction)
    const rlpDecodedTx = rlp.decode(rlpEncodedTx, false)

    const airgapTx: IAirGapTransaction = {
      amount: new BigNumber(parseInt(rlpDecodedTx[4].toString('hex'), 16)).toString(10),
      fee: new BigNumber(parseInt(rlpDecodedTx[5].toString('hex'), 16)).toString(10),
      from: [await this.getAddressFromPublicKey(rlpDecodedTx[2].slice(1).toString('hex'))],
      isInbound: false,
      protocolIdentifier: this.identifier,
      network: this.options.network,
      to: [await this.getAddressFromPublicKey(rlpDecodedTx[3].slice(1).toString('hex'))],
      data: (rlpDecodedTx[8] || '').toString('utf8'),
      transactionDetails: unsignedTx.transaction
    }

    return [airgapTx]
  }

  public async getTransactionDetailsFromSigned(signedTx: SignedAeternityTransaction): Promise<IAirGapTransaction[]> {
    const rlpEncodedTx = this.decodeTx(signedTx.transaction)
    const rlpDecodedTx = rlp.decode(rlpEncodedTx, false)

    const unsignedAeternityTransaction: UnsignedAeternityTransaction = {
      publicKey: '',
      callback: '',
      transaction: {
        networkId: 'ae_mainnet',
        transaction: `tx_${bs64check.encode(rlpDecodedTx[3])}`
      }
    }

    return this.getTransactionDetails(unsignedAeternityTransaction)
  }

  public async getBalanceOfAddresses(addresses: string[]): Promise<string> {
    let balance = new BigNumber(0)

    for (const address of addresses) {
      try {
        const { data } = await axios.get(`${this.options.network.rpcUrl}/v2/accounts/${address}`)
        balance = balance.plus(new BigNumber(data.balance))
      } catch (error) {
        // if node returns 404 (which means 'no account found'), go with 0 balance
        if (error.response.status !== 404) {
          throw error
        }
      }
    }

    return balance.toString(10)
  }

  public async getBalanceOfPublicKey(publicKey: string): Promise<string> {
    const address = await this.getAddressFromPublicKey(publicKey)

    return this.getBalanceOfAddresses([address])
  }

  public async getAvailableBalanceOfAddresses(addresses: string[]): Promise<string> {
    return this.getBalanceOfAddresses(addresses)
  }

  public async estimateMaxTransactionValueFromPublicKey(publicKey: string, recipients: string[], fee?: string): Promise<string> {
    const balance = await this.getBalanceOfPublicKey(publicKey)
    const balanceWrapper = new BigNumber(balance)

    let maxFee: BigNumber
    if (fee !== undefined) {
      maxFee = new BigNumber(fee)
    } else {
      const estimatedFeeDefaults = await this.estimateFeeDefaultsFromPublicKey(publicKey, recipients, [balance])
      maxFee = new BigNumber(estimatedFeeDefaults.medium).shiftedBy(this.decimals)
      if (maxFee.gte(balanceWrapper)) {
        maxFee = new BigNumber(0)
      }
    }

    let amountWithoutFees = balanceWrapper.minus(maxFee)
    if (amountWithoutFees.isNegative()) {
      amountWithoutFees = new BigNumber(0)
    }

    return amountWithoutFees.toFixed()
  }

  public async estimateFeeDefaultsFromPublicKey(
    publicKey: string,
    recipients: string[],
    values: string[],
    data?: any
  ): Promise<FeeDefaults> {
    return (await axios.get(this.feesURL)).data
  }

  public async prepareTransactionFromPublicKey(
    publicKey: string,
    recipients: string[],
    values: string[],
    fee: string,
    payload?: string
  ): Promise<RawHarmonyTransaction> {
    let nonce = 1

    const address: string = await this.getAddressFromPublicKey(publicKey)

    try {
      const { data: accountResponse } = await axios.get(`${this.options.network.rpcUrl}/v2/accounts/${address}`)
      nonce = accountResponse.nonce + 1
    } catch (error) {
      // if node returns 404 (which means 'no account found'), go with nonce 0
      if (error.response && error.response.status !== 404) {
        throw error
      }
    }

    const balance: BigNumber = new BigNumber(await this.getBalanceOfPublicKey(publicKey))

    if (balance.isLessThan(fee)) {
      throw new Error('not enough balance')
    }

    const sender = publicKey
    const recipient = bs58check.decode(recipients[0].replace('ak_', ''))

    const txObj = {
      tag: this.toHexBuffer(12),
      version: this.toHexBuffer(1),
      sender_id: Buffer.concat([this.toHexBuffer(1), Buffer.from(sender, 'hex')]),
      recipient_id: Buffer.concat([this.toHexBuffer(1), recipient]),
      amount: this.toHexBuffer(new BigNumber(values[0])),
      fee: this.toHexBuffer(new BigNumber(fee)),
      ttl: this.toHexBuffer(0),
      nonce: this.toHexBuffer(nonce),
      payload: Buffer.from(payload || '')
    }

    const txArray = Object.keys(txObj).map((a) => txObj[a])
    const rlpEncodedTx = rlp.encode(txArray)
    const preparedTx = `tx_${bs64check.encode(rlpEncodedTx)}`

    return {
      transaction: preparedTx,
      networkId: this.defaultNetworkId
    }
  }

  

  public async broadcastTransaction(rawTransaction: string): Promise<string> {
    const { data } = await axios.post(
      `${this.options.network.rpcUrl}/v2/transactions`,
      { tx: rawTransaction },
      { headers: { 'Content-Type': 'application/json' } }
    )

    return data.tx_hash
  }

  private toHexBuffer(value: number | BigNumber): Buffer {
    const hexString: string = EthereumUtils.toHex(value).substr(2)

    return Buffer.from(padStart(hexString, hexString.length % 2 === 0 ? hexString.length : hexString.length + 1, '0'), 'hex')
  }

  public async signMessage(message: string, keypair: { privateKey: Buffer }): Promise<string> {
    return new HarmonyCryptoClient().signMessage(message, keypair)
  }

  public async verifyMessage(message: string, signature: string, publicKey: string): Promise<boolean> {
    return new HarmonyCryptoClient().verifyMessage(message, signature, publicKey)
  }
  public async getTransactionStatuses(transactionHashes: string[]): Promise<AirGapTransactionStatus[]> {
    return Promise.reject('Transaction status not implemented')
  }
}
