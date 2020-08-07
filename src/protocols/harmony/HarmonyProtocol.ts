import { KeyPair } from '../../data/KeyPair'
import axios  from '../../dependencies/src/axios-0.19.0/index'
import BigNumber from '../../dependencies/src/bignumber.js-9.0.0/bignumber'
import { mnemonicToSeed, validateMnemonic } from '../../dependencies/src/bip39-2.5.0/index'
import { keccak256 } from '../../dependencies/src/ethereumjs-util-5.2.0/index'
import * as bs58check from '../../dependencies/src/bs58check-2.1.2/index'
import SECP256K1 = require('../../dependencies/src/secp256k1-3.7.1/elliptic')
import { BIP32Interface, fromSeed } from '../../dependencies/src/bip32-2.0.4/src/index'
const { Harmony, HarmonyAddress } = require('@harmony-js/core');
const { getAddress } = require('@harmony-js/crypto');
const { ChainID, ChainType, Unit } = require('@harmony-js/utils');
import { IAirGapSignedTransaction } from '../../interfaces/IAirGapSignedTransaction'
import { AirGapTransactionStatus, IAirGapTransaction } from '../../interfaces/IAirGapTransaction'
import { UnsignedHarmonyTransaction } from '../../serializer/schemas/definitions/transaction-sign-request-harmony'
import { SignedHarmonyTransaction } from '../../serializer/schemas/definitions/transaction-sign-response-harmony'
import { RawHarmonyTransaction } from '../../serializer/types'
import bs64check from '../../utils/base64Check'
import { padStart } from '../../utils/padStart'
import { MainProtocolSymbols, ProtocolSymbols } from '../../utils/ProtocolSymbols'
import { EthereumUtils } from '../ethereum/utils/utils'
import { CurrencyUnit, FeeDefaults, ICoinProtocol } from '../ICoinProtocol'
import { NonExtendedProtocol } from '../NonExtendedProtocol'
import { HarmonyCryptoClient } from './HarmonyCryptoClient'

import { HarmonyProtocolOptions } from './HarmonyProtocolOptions'
import { TransactionListQuery } from './Query/HarmonyTransactionListQuery'
import { BalanceQuery } from './Query/HarmonyBalanceQuery'
import { SendQuery } from './Query/HarmonySendQuery'
import { EstimateGasQuery } from './Query/HarmonyEstimateGasQuery'

export class HarmonyProtocol extends NonExtendedProtocol implements ICoinProtocol {
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
  private  hmy = new Harmony(
    'https://api.s0.b.hmny.io/',
    {
      chainType: ChainType.Harmony,
      chainId: ChainID.HmyTestnet,
    },
  );
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
    return '0x' + this.generateKeyPair(mnemonic, derivationPath, password).publicKey.toString('hex')
  }

  public async getPrivateKeyFromMnemonic(mnemonic: string, derivationPath: string, password?: string): Promise<Buffer> {
    return this.generateKeyPair(mnemonic, derivationPath, password).privateKey
  }


  public async getPublicKeyFromHexSecret(secret: string, derivationPath: string): Promise<string> {
    const node: BIP32Interface = fromSeed(Buffer.from(secret, 'hex'))

    return '0x' + this.generateKeyPairFromNode(node, derivationPath).publicKey.toString('hex')
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
    const ecKey = SECP256K1.keyFromPublic(publicKey.slice(2), 'hex');
    const publicHash = ecKey.getPublic(false, 'hex');
    const address = '0x' + keccak256('0x' + publicHash.slice(2)).slice(-40);
    return getAddress(address).bech32;
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
        const query: TransactionListQuery = new TransactionListQuery(offset, limit, address)
        const { data } = await axios.post(
          `${this.options.network.rpcUrl}/`,
          query.toJSONBody,
          { headers: { 'Content-Type': 'application/json' } }
        )
        return data
      })
    )

    const transactions: any[] = [].concat(
      ...allTransactions.map((axiosData) => {
        return axiosData.data || []
      })
    )

    return transactions.map((obj) => {
      const parsedTimestamp = parseInt(obj.timestamp, 10)
      const airGapTx: IAirGapTransaction = {
        amount: new BigNumber(obj.tx.value).toString(10),
        fee: new BigNumber(obj.tx.gasPrice).toString(10),
        from: [obj.from],
        isInbound: addresses.indexOf(obj.to) !== -1,
        protocolIdentifier: this.identifier,
        network: this.options.network,
        to: [obj.to],
        hash: obj.blockHash,
        blockHeight: obj.blockNumber,
        extra:{
          'shardID': obj.shardID,
          'toShardID': obj.toShardID,
          'nonce': obj.nonce
        }
      }

      if (obj.input) {
          airGapTx.data = obj.input
      }

      if (!isNaN(parsedTimestamp)) {
        airGapTx.timestamp = Math.round(parsedTimestamp / 1000)
      }

      return airGapTx
    })
  }


  public async signWithPrivateKey(privateKey: Buffer, transaction: RawHarmonyTransaction): Promise<IAirGapSignedTransaction> {
    // sign and cut off first byte ('ae')
    const rawTx = transaction.transaction
    const account = this.hmy.wallet.addByPrivateKey(privateKey);
    const newTxn = this.hmy.transactions.newTx();
    newTxn.recover(rawTx);
    const signedTxn = await account.signTransaction(newTxn);
  
    return signedTxn
  }

  private decodeTx(transaction: string): any {
    let rawTx: any

    try {
      rawTx = bs64check.decode(transaction)

      return rawTx
    } catch (error) {
      //
    }

    try {
      rawTx = bs58check.decode(transaction)

      return rawTx
    } catch (error) {
      //
    }

    throw new Error('invalid TX-encoding')
  }

  public async getTransactionDetails(unsignedTx: UnsignedHarmonyTransaction): Promise<IAirGapTransaction[]> {
    const transaction = unsignedTx.transaction.transaction
    const newTxn = this.hmy.transactions.newTx();
    newTxn.recover(transaction);

    const newAirgapTx: IAirGapTransaction = {
        amount: newTxn.tx.value.toString(10),
        fee: newTxn.tx.gasPrice.toString(10),
        from: [newTxn.from],
        isInbound: false,
        protocolIdentifier: this.identifier,
        network: this.options.network,
        to: [newTxn.to],
        hash: newTxn.blockHash,
        blockHeight: newTxn.blockNumber,
        extra: {
          'shardID': newTxn.shardID,
          'toShardID': newTxn.toShardID,
          'nonce': newTxn.nonce
        },
        transactionDetails: unsignedTx.transaction
      }
    if (newTxn.input) {
      newAirgapTx.data = newTxn.input
    }
    return [newAirgapTx]
  }

  public async getTransactionDetailsFromSigned(signedTx: SignedHarmonyTransaction): Promise<IAirGapTransaction[]> {
    const unsignedHarmonyTransaction: UnsignedHarmonyTransaction = {
      publicKey: '',
      callback: '',
      transaction: {
        networkId: this.defaultNetworkId,
        transaction: signedTx.transaction
      }
    }

    return this.getTransactionDetails(unsignedHarmonyTransaction)
  }

  public async getBalanceOfAddresses(addresses: string[]): Promise<string> {
    let balance = new BigNumber(0)

    for (const address of addresses) {
      try {
        const query: BalanceQuery = new BalanceQuery(address)
        const { data } = await axios.post(
          `${this.options.network.rpcUrl}/`,
          query.toJSONBody,
          { headers: { 'Content-Type': 'application/json' } }
        )
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
    
    const query: EstimateGasQuery = new EstimateGasQuery()
    const axiosRes= await axios.post(
      `${this.options.network.rpcUrl}/`,
      query.toJSONBody,
      { headers: { 'Content-Type': 'application/json' } }
    )
    return axiosRes.data
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
      const  transactions = await this.getTransactionsFromAddresses([address], 1, 0)
      nonce = transactions[0].extra.nonce + 1
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

    const sender = new HarmonyAddress(this.getAddressFromPublicKey(publicKey)).checksum
    const reciever = new HarmonyAddress(recipients[0]).checksum
    const gasPrice = .000000001
    const gasEstimate = 21000

    let newTx = this.hmy.transaction.newTx({
      to: reciever,
      value: Unit.Szabo(values[0]).toWei(),
      from: sender,
      shardID: 0,
      toShardID: 0,
      gasLimit: gasEstimate,
      nonce:nonce,
      gasPrice: new Unit.One(gasPrice).toHex()
    })
    
    let [unsignedRawTransaction, raw] = newTx.getRLPUnsigned();
    const rlpEncodedTx = unsignedRawTransaction

    return {
      transaction: rlpEncodedTx,
      networkId: this.defaultNetworkId
    }
  }

  

  public async broadcastTransaction(rawTransaction: string): Promise<string> {
    const query: SendQuery = new SendQuery(rawTransaction)

    const { data } = await axios.post(
      `${this.options.network.rpcUrl}/`,
      query.toJSONBody,
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
