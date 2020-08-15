import { KeyPair } from '../../data/KeyPair'
import axios  from '../../dependencies/src/axios-0.19.0/index'
import BigNumber from '../../dependencies/src/bignumber.js-9.0.0/bignumber'
import { HarmonyTransactionResult, HarmonyTransactionCursor } from './HarmonyTypes'

// import { keccak256 } from '../../dependencies/src/ethereumjs-util-5.2.0/index'
// import * as bs58check from '../../dependencies/src/bs58check-2.1.2/index'
import SECP256K1 = require('../../dependencies/src/secp256k1-3.7.1/elliptic')
import { BIP32Interface, fromSeed } from '../../dependencies/src/bip32-2.0.4/src/index'
const { Harmony } = require('@harmony-js/core');
const {
  bip39,
  // hdkey,
  // EncryptOptions, 
  getAddress,
  // getAddressFromPublicKey,
  // generatePrivateKey,
  // getPubkeyFromPrivateKey,
  // getAddressFromPrivateKey
  HarmonyAddress
} = require("@harmony-js/crypto")
// import { 
//   bip39, 
//   // hdkey,
//   // EncryptOptions, 
//   getAddress, 
//   // getAddressFromPublicKey,
//   // generatePrivateKey,
//   // getPubkeyFromPrivateKey,
//   // getAddressFromPrivateKey
//   HarmonyAddress
//  } from '@harmony-js/crypto';

const { ChainID, ChainType, Unit } = require('@harmony-js/utils');
import { IAirGapSignedTransaction } from '../../interfaces/IAirGapSignedTransaction'
import { AirGapTransactionStatus, IAirGapTransaction } from '../../interfaces/IAirGapTransaction'
import { UnsignedHarmonyTransaction } from '../../serializer/schemas/definitions/transaction-sign-request-harmony'
import { SignedHarmonyTransaction } from '../../serializer/schemas/definitions/transaction-sign-response-harmony'
import { RawHarmonyTransaction } from '../../serializer/types'
// import bs64check from '../../utils/base64Check'
// import { padStart } from '../../utils/padStart'
import { MainProtocolSymbols, ProtocolSymbols } from '../../utils/ProtocolSymbols'
// import { EthereumUtils } from '../ethereum/utils/utils'
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
  public standardDerivationPath: string = `m/44'/60'/0'/0/0`

  public addressIsCaseSensitive: boolean = true
  public addressValidationPattern: string = '^one1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$'
  public addressPlaceholder: string = 'one1_abc...'

  // ae specifics
  public defaultNetworkId: string = '0'

  // private readonly feesURL: string = 'https://api-airgap.gke.papers.tech/fees'
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

  public generateKeyPair(mnemonic: string, derivationPath: string = this.standardDerivationPath, password?:string): KeyPair {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error(`Invalid mnemonic phrase: ${mnemonic}`);
    }
    let account = this.hmy.wallet.addByMnemonic(mnemonic);
    let publicKey = account.publicKey;
    let privateKey = account.privateKey

    return {
      publicKey,
      privateKey
    }
  }

  private generateKeyPairFromNode(node: any, derivationPath: string): KeyPair {
    const keys = node.derive(derivationPath)
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
    return this.generateKeyPair(mnemonic, derivationPath).publicKey.toString('hex').slice(2)
  }

  public async getPrivateKeyFromMnemonic(mnemonic: string, derivationPath: string, password?: string): Promise<Buffer> {
    let key = this.generateKeyPair(mnemonic, derivationPath, password).privateKey.toString('hex')
    let newPvt = Buffer.from(key.slice(2), "hex")
    return newPvt
  }

  public async getExtendedPrivateKeyFromMnemonic(mnemonic: string, derivationPath: string, password?: string): Promise<string> {
    throw new Error('extended private key support for harmony not implemented')
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

  // public async getAddressFromPublicKey(publicKey: string): Promise<string> {
  //   this.hmy.crypto.getAddressesFromPublicKey()
  //   SECP256K1.
  //   const ecKey = SECP256K1.keyFromPublic(publicKey, 'hex');
  //   const publicHash = ecKey.getPublic(false, 'hex');
  //   const address = '0x' + keccak256('0x' + publicHash.slice(2)).slice(-40);
  //   return getAddress(address).bech32;
  // }
  public async getAddressFromPublicKey(publicKey: string): Promise<string> {
    let key = this.hmy.crypto.getAddressFromPublicKey('0x'+publicKey)
    return getAddress(key).bech32;
  }

  public async getAddressesFromPublicKey(publicKey: string): Promise<string[]> {
    const address = await this.getAddressFromPublicKey(publicKey)

    return [address]
  }

  public async getTransactionsFromPublicKey(
    publicKey: string, 
    limit: number, 
    cursor?: HarmonyTransactionCursor
  ): Promise<HarmonyTransactionResult> {
    return this.getTransactionsFromAddresses([await this.getAddressFromPublicKey(publicKey)], limit, cursor)
  }

  public async getTransactionsFromAddresses(
    addresses: string[], 
    limit: number=1000, 
    cursor?: HarmonyTransactionCursor
  ): Promise<HarmonyTransactionResult> {

    const offset = cursor ? cursor.offset : 0

    const allTransactions = await Promise.all(
      addresses.map(async (address) => {
        const query: TransactionListQuery = new TransactionListQuery(offset, limit, address)
        const { data } = await axios.post(
          `${this.options.network.rpcUrl}/`,
          query.toJSONBody(),
          { headers: { 'Content-Type': 'application/json' } }
        )
        return data.result.transactions
      })
    )

    const transactions: any[] = [].concat(
      ...allTransactions.map((axiosData) => {
        return axiosData || []
      })
    )
    
    transactions.map((obj) => {
      const parsedTimestamp = parseInt(obj.timestamp, 10)
      const airGapTx: IAirGapTransaction = {
        amount: new BigNumber(obj.value).toString(10),
        fee: new BigNumber(obj.gasPrice).toString(10),
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
    return { transactions, cursor: { offset: cursor ? cursor.offset : limit } }
    
    // return { transactions, cursor: { page: cursor ? cursor.page + 1 : 2 } }

  }


  public async signWithPrivateKey(privateKey: Buffer, transaction: RawHarmonyTransaction): Promise<IAirGapSignedTransaction> {
    // console.log(privateKey.toString)
    const rawTx = transaction.transaction
    const account = this.hmy.wallet.addByPrivateKey(privateKey.toString('hex'));
    const newTxn = this.hmy.transactions.newTx();
    newTxn.recover(rawTx);
    const signedTxn = await account.signTransaction(newTxn);
    return signedTxn.rawTransaction
  }

  public async getTransactionDetails(unsignedTx: UnsignedHarmonyTransaction): Promise<IAirGapTransaction[]> {
    // console.log(unsignedTx)
    const transaction = unsignedTx.transaction.transaction
    const newTxn = this.hmy.transactions.newTx();
    let sender:string=''
    let reciever:string=''
    let value:number =0
    let fee:number =0
    newTxn.recover(transaction);
    // console.log(newTxn)

    if (newTxn.from !='0x')
    sender = this.hmy.crypto.getAddress(newTxn.from).bech32

    if (newTxn.to != '0x')
    reciever = this.hmy.crypto.getAddress(newTxn.to).bech32

    if (newTxn.value.toString(10)) {
      const coins = new this.hmy.utils.Unit(newTxn.value)
        .asWei()
        .toOne();
      value = parseInt(coins)

    }

    if (newTxn.gasPrice.toString(10)) {
       fee = new this.hmy.utils.Unit(newTxn.gasPrice)
        .asWei()
        .toOne()
    }

    // let coins = new BigNumber(Number('0x' + newTxn.value.toString('hex'))).div(1e12).toNumber()

    const newAirgapTx: IAirGapTransaction = {
        amount: value.toString(),
        fee: fee.toString(),
        from: [sender],
        isInbound: false,
        protocolIdentifier: this.identifier,
        network: this.options.network,
        to: [reciever],
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
          query.toJSONBody(),
          { headers: { 'Content-Type': 'application/json' } }
        )
        balance = balance.plus(new BigNumber(data.result))
      } catch (error) {
        // console.log(error)
        // if node returns 404 (which means 'no account found'), go with 0 balance
        if (error.code == 'ENOTFOUND') {
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
      
      const  ts = await this.getTransactionsFromAddresses([address], 1)
      if (ts.transactions.length>0)
        nonce = ts.transactions[0].extra.nonce + 1
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
    let value: number = parseInt(values[0])
    const default_gas_price = 1e-9
    const sender = new HarmonyAddress(address).checksum
    const reciever = new HarmonyAddress(recipients[0]).checksum
    const gasPrice = default_gas_price.toFixed(9)
    const gasEstimate = 42000
    value = value * 1000000

    let newTx = this.hmy.transactions.newTx({
      to: reciever,
      value: Unit.Szabo(value).toWei(),
      from: sender,
      shardID: 0,
      toShardID: 0,
      gasLimit: gasEstimate,
      nonce:nonce,
      gasPrice: new Unit.One(gasPrice).toHex()
    })
    let [unsignedRawTransaction] = newTx.getRLPUnsigned();
    const rlpEncodedTx = unsignedRawTransaction

    return {
      transaction: rlpEncodedTx,
      networkId: this.defaultNetworkId
    }
  }

  

  public async broadcastTransaction(rawTransaction: string): Promise<string> {
    let res:string = ''
    try {
      const query: SendQuery = new SendQuery(rawTransaction)
      const { data } = await axios.post(
        `${this.options.network.rpcUrl}/`,
        query.toJSONBody(),
        { headers: { 'Content-Type': 'application/json' } }
      )

      res = data.result
    } catch (error) {
      console.log(error)
      // if node returns 404 (which means 'no account found'), go with 0 balance
      if (error.code == 'ENOTFOUND') {
        throw error
      }
    }
  
    return res

  }

  // private toHexBuffer(value: number | BigNumber): Buffer {
  //   const hexString: string = EthereumUtils.toHex(value).substr(2)

  //   return Buffer.from(padStart(hexString, hexString.length % 2 === 0 ? hexString.length : hexString.length + 1, '0'), 'hex')
  // }

  public async signMessage(message: string, keypair: { publicKey: string, privateKey: Buffer }): Promise<string> {
    return new HarmonyCryptoClient().signMessage(message, keypair)
  }

  public async verifyMessage(message: string, signature: string, publicKey: string): Promise<boolean> {
    return new HarmonyCryptoClient().verifyMessage(message, signature, publicKey)
  }
  public async getTransactionStatuses(transactionHashes: string[]): Promise<AirGapTransactionStatus[]> {
    return Promise.reject('Transaction status not implemented')
  }

}
