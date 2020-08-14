import { ICoinProtocol } from '../../src'
import * as BIP39 from '../../src/dependencies/src/bip39-2.5.0/index'
import { AirGapTransactionStatus } from '../../src/interfaces/IAirGapTransaction'
import { IACMessageType } from '../../src/serializer/interfaces'
import { IACMessageDefinitionObject } from '../../src/serializer/message'

const mnemonic: string = 'spell device they juice trial skirt amazing boat badge steak usage february virus art survey'

interface ProtocolHTTPStub {
  registerStub(testProtocolSpec: TestProtocolSpec, protocol: ICoinProtocol): void
  noBalanceStub(testProtocolSpec: TestProtocolSpec, protocol: ICoinProtocol): void
}

abstract class TestProtocolSpec {
  public name: string = 'TEST'
  // tslint:disable:no-object-literal-type-assertion
  public lib: ICoinProtocol = {} as ICoinProtocol // Class is abstract, will be overwritten
  public stub: ProtocolHTTPStub = {} as ProtocolHTTPStub // Class is abstract, will be overwritten
  // tslint:enable:no-object-literal-type-assertion
  public validAddresses: string[] = []
  public wallet: {
    privateKey: string
    publicKey: string
    addresses: string[]
  } = {
    privateKey: '',
    publicKey: '',
    addresses: ['']
  }
  public txs: {
    to: string[]
    from: string[]
    amount: string
    fee: string
    properties?: string[]
    unsignedTx: any
    signedTx: string
  }[] = []
  public messages: { message: string; signature: string }[] = []

  public transactionStatusTests: { hashes: string[]; expectedResults: AirGapTransactionStatus[] }[] = []

  public seed(): string {
    return BIP39.mnemonicToSeedHex(mnemonic)
  }

  public mnemonic(): string {
    return mnemonic
  }

  public unsignedTransaction(tx: any): IACMessageDefinitionObject[] {
    return [
      {
        protocol: this.lib.identifier,
        type: IACMessageType.TransactionSignRequest,
        payload: {
          publicKey: this.wallet.publicKey,
          callback: 'bobo-wallet://?d=',
          transaction: tx.unsignedTx
        }
      }
    ]
  }

  public signedTransaction(tx: any): IACMessageDefinitionObject[] {
    return [
      {
        protocol: this.lib.identifier,
        type: IACMessageType.TransactionSignResponse,
        payload: {
          accountIdentifier: this.wallet.publicKey,
          transaction: tx.signedTx
        }
      }
    ]
  }

  public syncWallet(): IACMessageDefinitionObject[] {
    return [
      {
        protocol: this.lib.identifier,
        type: IACMessageType.AccountShareResponse,
        payload: {
          publicKey: this.wallet.publicKey,
          isExtendedPublicKey: this.lib.supportsHD,
          derivationPath: this.lib.standardDerivationPath
        }
      }
    ]
  }
}

export { mnemonic, TestProtocolSpec, ProtocolHTTPStub }
