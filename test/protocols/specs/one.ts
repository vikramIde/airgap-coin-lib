import { SignedHarmonyTransaction } from '../../../src/serializer/schemas/definitions/transaction-sign-response-harmony'
import { RawHarmonyTransaction } from '../../../src/serializer/types'
import { TestProtocolSpec } from '../implementations'
import { HarmonyProtocolStub } from '../stubs/one.stub'

import { HarmonyProtocol } from '../../../src/protocols/harmony/HarmonyProtocol'
import { HarmonyTransactionValidator } from '../../../src/serializer/unsigned-transactions/harmony-transactions.validator'

// Test Mnemonic:
// mango club state husband keen fiber float jelly major include horse infant square spike equip caught version must pen swim setup right poem economy
// Entropy: 8725875337f79aab564bbe866e4db739ad37a3930923f2d24289edfc4973a9c2
// Private Key: 65093ac9899ced07211b56eaef83c2fdfef11ecea77a665d2d59cf93c40e5196
// Public Key: d64f61ec56519e7f10f35908c40f7b3288fb3ebdc0f6c504aa95ec780e3c7ff9
// HEX Seed: a109e38f00824ea80107cd7ccbac4e7afe7abe588eeac9191d71adf98fb1fba73311182c010a0182e20e67f4daa45bf1cbbbecab8ff407f33e50045d7d516e0c

export class ONETestProtocolSpec extends TestProtocolSpec {
  public name = 'Harmony'
  public lib = new HarmonyProtocol()
  public stub = new HarmonyProtocolStub()
  public validAddresses = [
    'one15cahsfs9mveqekme9jwqxr55pmhek2m9qdkg9u',
    'one1rn7z9dhdxcv7rnc6mw4d743tpp9qprekq39zwf',
    'one18h3j75qhe5gr8f8k44ggf0h86ysgyppyrzvzq2',
    'one14pd5rd2qepmla0hxu5gdljhnv36qgpr6s78z6h',
    'one1ajnm2g67ttd0h6ry9vcntlzqqajtjee7n72egw',
    'one1ddd4a8weu8rknkwcskv3q43ya083u73gkru2vr',
    'one12fqzk7r6xyrkz69n5lhxev0q7yp670k7uqwp2c',
    'one1hxttz4sgvxeknk59hw6jje9hfzqpnlrnz6r245',
    'one109lvltgsyl409j8k2y982k8e7zrm7fzvav33ug',
    'one1tkzhj0pq4254qcqvxlx2uau9crl89l5qy3z0ec',
    'one1dvvr2wgwy35jqr9lve9twjek657wryu8urnuj3'
  ]
  public wallet = {
    privateKey:
      "0x5906b34bd8d7954835a248017f6a9d1eaed8480a48fd0d1e0e11eae9c79d691d",
    publicKey: "0x02c3dab3927385d1fb24839ec7a9879040e9135a1bbb89a7dae3b79e6cf3ed7dc7",
    addresses: ["one15cahsfs9mveqekme9jwqxr55pmhek2m9qdkg9u"]
  }
  public txs = [
    {
      /*
        HEX of Unsigned TX includes:
        sender_id: 'ak_2dPGHd5dZgKwR234uqPZcAXXcCyxr3TbWwgV8NSnNincth4Lf7',
        recipient_id: 'ak_2dPGHd5dZgKwR234uqPZcAXXcCyxr3TbWwgV8NSnNincth4Lf7',
        amount: 10,
        fee: 1,
        ttl: ? (maybe 1000),
        payload: ''
      */
      to: ["0x1CfC22B6ED3619e1cf1AdBAadf562b084A008f36"],
      from: ["0xa63b782605db320cDb792c9c030e940Eef9B2b65"],
      amount: '100',
      fee: '2100',
      unsignedTx: {
        transaction:
          '0xee80843b9aca0082a4108080941cfc22b6ed3619e1cf1adbaadf562b084a008f3689056bc75e2d6310000080028080',
        networkId: '0'
      },
      signedTx:
        '0xf86e80843b9aca0082a4108080941cfc22b6ed3619e1cf1adbaadf562b084a008f3689056bc75e2d631000008027a0e50b5a8f97e032fd59a7baad40c5e8bb77dce702e96013feb1d65e16098b270ca02f3f4123a059242e7de8bc846849f755f3ddca72c05c939fbc28ba2d1cce0cbf'
    }
  ]

  public seed(): string {
    return 'a109e38f00824ea80107cd7ccbac4e7afe7abe588eeac9191d71adf98fb1fba73311182c010a0182e20e67f4daa45bf1cbbbecab8ff407f33e50045d7d516e0c'
  }

  public mnemonic(): string {
    return 'mango club state husband keen fiber float jelly major include horse infant square spike equip caught version must pen swim setup right poem economy'
  }

  public invalidUnsignedTransactionValues: { property: string; testName: string; values: { value: any; expectedError: any }[] }[] = [
    {
      property: 'transaction',
      testName: 'Transaction',
      values: [
        {
          value: '0x0',
          expectedError: [' invalid tx format']
        }, // TODO: Valid?
        {
          value: '',
          expectedError: [" can't be blank", ' invalid tx format']
        },
        {
          value: 0x0,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: 1,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: -1,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: undefined,
          expectedError: [" can't be blank"]
        },
        {
          value: null,
          expectedError: [" can't be blank"]
        }
      ]
    }
  ]

  public invalidSignedTransactionValues: { property: string; testName: string; values: { value: any; expectedError: any }[] }[] = [
    {
      property: 'transaction',
      testName: 'Transaction',
      values: [
        {
          value: '0x0',
          expectedError: [' invalid tx format']
        }, // TODO: Valid?
        {
          value: '',
          expectedError: [" can't be blank", ' invalid tx format']
        },
        {
          value: 0x0,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: 1,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: -1,
          expectedError: [' is not of type "String"', " isn't base64 encoded"]
        },
        {
          value: undefined,
          expectedError: [" can't be blank"]
        },
        {
          value: null,
          expectedError: [" can't be blank"]
        }
      ]
    },
    {
      property: 'accountIdentifier',
      testName: 'Account identifier',
      values: [
        {
          value: '0x0',
          expectedError: [' not a valid Harmony account']
        },
        {
          value: '',
          expectedError: [" can't be blank", ' not a valid Harmony account']
        },
        {
          value: 0x0,
          expectedError: [' is not of type "String"', ' not a valid Harmony account']
        },
        {
          value: 1,
          expectedError: [' is not of type "String"', ' not a valid Harmony account']
        },
        {
          value: -1,
          expectedError: [' is not of type "String"', ' not a valid Harmony account']
        },
        {
          value: null,
          expectedError: [" can't be blank"]
        },
        {
          value: undefined,
          expectedError: [" can't be blank"]
        }
      ]
    }
  ]
  public validRawTransactions: RawHarmonyTransaction[] = [
    {
      transaction:"0xf86e06843b9aca0082a410808094df29afd7fe1cb487a97dcb07b01d8a9aaf3f4bac89056bc75e2d631000008027a07b44dc591656233f57d3d37dc47ae8fdfe18db38b87e80e110220aae3e89795da04f2c93dbd0cc6b7a63894dd70241239ef7f9702db928280b2ac01e5030d225b1",
      networkId: '0'
    }
  ]

  public validSignedTransactions: SignedHarmonyTransaction[] = [
    {
      accountIdentifier: 'jkjlk',
      transaction:
        '0xf86e80843b9aca0082a4108080941cfc22b6ed3619e1cf1adbaadf562b084a008f3689056bc75e2d631000008027a0e50b5a8f97e032fd59a7baad40c5e8bb77dce702e96013feb1d65e16098b270ca02f3f4123a059242e7de8bc846849f755f3ddca72c05c939fbc28ba2d1cce0cbf'
    }
  ]

  public validator: HarmonyTransactionValidator = new HarmonyTransactionValidator()

  public messages = [
    {
      message: 'example message',
      signature:
        '8f1c4ab15b7e26a602e711fe58d55636423790ffbeb50bfbd48d9277ddac918d9941f731c0b537d8c126686a64a93c54b32001158951e981de33b7431798860b'
    }
  ]
}
