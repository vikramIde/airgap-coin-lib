import { CosmosTransaction } from '../protocols/cosmos/CosmosTransaction'
import { MainProtocolSymbols, ProtocolSymbols, SubProtocolSymbols } from '../utils/ProtocolSymbols'

import { IACProtocol } from './inter-app-communication-protocol'
import { IACMessageType } from './interfaces'
import { IACMessageDefinitionObject } from './message'
import { FullPayload } from './payloads/full-payload'
import { Payload } from './payloads/payload'
import { UnsignedTransaction } from './schemas/definitions/transaction-sign-request'
import { SerializableUnsignedCosmosTransaction } from './schemas/definitions/transaction-sign-request-cosmos'
import { SchemaInfo, SchemaRoot } from './schemas/schema'
import { AeternityTransactionValidator } from './unsigned-transactions/aeternity-transactions.validator'
import { HarmonyTransactionValidator } from './unsigned-transactions/harmony-transactions.validator'
import { BitcoinTransactionValidator } from './unsigned-transactions/bitcoin-transactions.validator'
import { CosmosTransactionValidator } from './unsigned-transactions/cosmos-transactions.validator'
import { EthereumTransactionValidator } from './unsigned-transactions/ethereum-transactions.validator'
import { SubstrateTransactionValidator } from './unsigned-transactions/substrate-transactions.validator'
import { TezosTransactionValidator } from './unsigned-transactions/tezos-transactions.validator'
import { TezosBTCTransactionValidator } from './unsigned-transactions/xtz-btc-transactions.validator'
import { TransactionValidator } from './validators/transactions.validator'

const accountShareResponse: SchemaRoot = require('./schemas/generated/account-share-response.json')

const messageSignRequest: SchemaRoot = require('./schemas/generated/message-sign-request.json')
const messageSignResponse: SchemaRoot = require('./schemas/generated/message-sign-response.json')

const unsignedTransactionAeternity: SchemaRoot = require('./schemas/generated/transaction-sign-request-aeternity.json')
const unsignedTransactionHarmony: SchemaRoot = require('./schemas/generated/transaction-sign-request-harmony.json')
const unsignedTransactionBitcoin: SchemaRoot = require('./schemas/generated/transaction-sign-request-bitcoin.json')
const unsignedTransactionCosmos: SchemaRoot = require('./schemas/generated/transaction-sign-request-cosmos.json')
const unsignedTransactionEthereum: SchemaRoot = require('./schemas/generated/transaction-sign-request-ethereum.json')
const unsignedTransactionTezos: SchemaRoot = require('./schemas/generated/transaction-sign-request-tezos.json')
const unsignedTransactionSubstrate: SchemaRoot = require('./schemas/generated/transaction-sign-request-substrate.json')

const signedTransactionAeternity: SchemaRoot = require('./schemas/generated/transaction-sign-response-aeternity.json')
const signedTransactionBitcoin: SchemaRoot = require('./schemas/generated/transaction-sign-response-bitcoin.json')
const signedTransactionCosmos: SchemaRoot = require('./schemas/generated/transaction-sign-response-cosmos.json')
const signedTransactionEthereum: SchemaRoot = require('./schemas/generated/transaction-sign-response-ethereum.json')
const signedTransactionHarmony: SchemaRoot = require('./schemas/generated/transaction-sign-response-harmony.json')
const signedTransactionTezos: SchemaRoot = require('./schemas/generated/transaction-sign-response-tezos.json')
const signedTransactionSubstrate: SchemaRoot = require('./schemas/generated/transaction-sign-response-substrate.json')

function unsignedTransactionTransformerCosmos(value: SerializableUnsignedCosmosTransaction): SerializableUnsignedCosmosTransaction {
  value.transaction = CosmosTransaction.fromJSON(value) as any

  return value
}

export enum IACPayloadType {
  FULL = 0,
  CHUNKED = 1
}

export class Serializer {
  private static readonly schemas: Map<string, SchemaInfo> = new Map()

  public static addSchema(schemaName: string, schema: SchemaInfo, protocol?: ProtocolSymbols): void {
    const protocolSpecificSchemaName: string = Serializer.getSchemName(schemaName, protocol)

    if (this.schemas.has(protocolSpecificSchemaName)) {
      throw new Error(`Schema ${protocolSpecificSchemaName} already exists`)
    }
    this.schemas.set(protocolSpecificSchemaName, schema)
  }

  public static getSchema(schemaName: string, protocol?: string): SchemaInfo {
    const protocolSpecificSchemaName: string = Serializer.getSchemName(schemaName, protocol)

    // Try to get the protocol specific scheme, if it doesn't exist fall back to the generic one
    const schema: SchemaInfo | undefined =
      this.schemas.get(protocolSpecificSchemaName) ?? this.schemas.get(Serializer.getSchemName(schemaName))

    if (!schema) {
      throw new Error(`Schema ${protocolSpecificSchemaName} does not exist`)
    }

    return schema
  }

  private static getSchemName(schemaName: string, protocol?: string): string {
    return protocol ? `${schemaName}-${protocol}` : schemaName
  }

  public async serialize(messages: IACMessageDefinitionObject[], chunkSize: number = 0): Promise<string[]> {
    if (
      messages.every((message: IACMessageDefinitionObject) => {
        let schema = Serializer.getSchema(message.type.toString(), message.protocol)
        return schema
      })
    ) {
      const iacps: IACProtocol[] = IACProtocol.create(JSON.parse(JSON.stringify(messages)), chunkSize)

      return iacps.map((iac: IACProtocol) => iac.encoded())
    } else {
      throw Error('Unknown schema')
    }
  }

  public async deserialize(data: string[]): Promise<IACMessageDefinitionObject[]> {
    const result: IACProtocol[] = IACProtocol.createFromEncoded(data)
    const deserializedIACMessageDefinitionObjects = result
      .map((el: IACProtocol) => el.payload)
      .map((el: Payload) => (el as FullPayload).asJson())
      .reduce((pv: IACMessageDefinitionObject[], cv: IACMessageDefinitionObject[]) => pv.concat(...cv), [] as IACMessageDefinitionObject[])

    return Promise.all(
      deserializedIACMessageDefinitionObjects.map((object) => {
        const unsignedTx = object.payload as UnsignedTransaction
        const validator = this.serializationValidatorByProtocolIdentifier(object.protocol)

        return validator.validateUnsignedTransaction(unsignedTx)
      })
    ).then(() => {
      return deserializedIACMessageDefinitionObjects
    })
  }

  public serializationValidatorByProtocolIdentifier(protocolIdentifier: ProtocolSymbols): TransactionValidator {
    const validators: { [key in ProtocolSymbols]?: any } = {
      // TODO: Exhaustive list?
      eth: EthereumTransactionValidator,
      btc: BitcoinTransactionValidator,
      grs: BitcoinTransactionValidator,
      ae: AeternityTransactionValidator,
      one: HarmonyTransactionValidator,
      xtz: TezosTransactionValidator,
      cosmos: CosmosTransactionValidator,
      polkadot: SubstrateTransactionValidator,
      kusama: SubstrateTransactionValidator,
      'xtz-btc': TezosBTCTransactionValidator
    }

    const exactMatch = Object.keys(validators).find((protocol) => protocolIdentifier === protocol)
    const startsWith = Object.keys(validators).find((protocol) => protocolIdentifier.startsWith(protocol))
    const validator = exactMatch ? exactMatch : startsWith
    if (!validator) {
      throw Error(`Validator not implemented for ${protocolIdentifier}, ${exactMatch}, ${startsWith}, ${validator}`)
    }

    return new validators[validator]()
  }
}

// Serializer.addSchema(IACMessageType.MetadataRequest.toString(), '')
// Serializer.addSchema(IACMessageType.MetadataResponse.toString(), '')

// Serializer.addSchema(IACMessageType.AccountShareRequest.toString(), accountShareRequest)
Serializer.addSchema(IACMessageType.AccountShareResponse.toString(), { schema: accountShareResponse })

Serializer.addSchema(IACMessageType.MessageSignRequest.toString(), { schema: messageSignRequest })
Serializer.addSchema(IACMessageType.MessageSignResponse.toString(), { schema: messageSignResponse })

// TODO: Make sure that we have a schema for every protocol we support
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionAeternity }, MainProtocolSymbols.AE)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionBitcoin }, MainProtocolSymbols.BTC)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionBitcoin }, MainProtocolSymbols.GRS)
Serializer.addSchema(
  IACMessageType.TransactionSignRequest.toString(),
  { schema: unsignedTransactionCosmos, transformer: unsignedTransactionTransformerCosmos },
  MainProtocolSymbols.COSMOS
)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionEthereum }, MainProtocolSymbols.ETH)
Serializer.addSchema(
  IACMessageType.TransactionSignRequest.toString(),
  { schema: unsignedTransactionEthereum },
  SubProtocolSymbols.ETH_ERC20
)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionHarmony }, MainProtocolSymbols.ONE)
Serializer.addSchema(
  IACMessageType.TransactionSignRequest.toString(),
  { schema: unsignedTransactionHarmony },
  SubProtocolSymbols.ONE_HRC20
)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionTezos }, MainProtocolSymbols.XTZ)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionTezos }, SubProtocolSymbols.XTZ_BTC)
Serializer.addSchema(
  IACMessageType.TransactionSignRequest.toString(),
  { schema: unsignedTransactionSubstrate },
  MainProtocolSymbols.POLKADOT
)
Serializer.addSchema(IACMessageType.TransactionSignRequest.toString(), { schema: unsignedTransactionSubstrate }, MainProtocolSymbols.KUSAMA)

Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionAeternity }, MainProtocolSymbols.AE)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionBitcoin }, MainProtocolSymbols.BTC)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionBitcoin }, MainProtocolSymbols.GRS)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionCosmos }, MainProtocolSymbols.COSMOS)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionEthereum }, MainProtocolSymbols.ETH)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionEthereum }, SubProtocolSymbols.ETH_ERC20)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionHarmony }, MainProtocolSymbols.ONE)
Serializer.addSchema(
  IACMessageType.TransactionSignResponse.toString(),
  { schema: signedTransactionHarmony },
  SubProtocolSymbols.ONE_HRC20
)

Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionTezos }, MainProtocolSymbols.XTZ)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionTezos }, SubProtocolSymbols.XTZ_BTC)
Serializer.addSchema(
  IACMessageType.TransactionSignResponse.toString(),
  { schema: signedTransactionSubstrate },
  MainProtocolSymbols.POLKADOT
)
Serializer.addSchema(IACMessageType.TransactionSignResponse.toString(), { schema: signedTransactionSubstrate }, MainProtocolSymbols.KUSAMA)
