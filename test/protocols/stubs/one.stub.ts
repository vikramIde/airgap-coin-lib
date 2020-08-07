import * as sinon from 'sinon'
import BigNumber from '../../../src/dependencies/src/bignumber.js-9.0.0/bignumber'
import { HarmonyProtocol } from '../../../src'
import axios from '../../../src/dependencies/src/axios-0.19.0/index'
import { ProtocolHTTPStub, TestProtocolSpec } from '../implementations'

export class HarmonyProtocolStub implements ProtocolHTTPStub {
  public registerStub(testProtocolSpec: TestProtocolSpec, protocol: HarmonyProtocol) {
    sinon
      .stub(axios, 'get')
      .withArgs(`${protocol.options.network.rpcUrl}/${testProtocolSpec.wallet.addresses[0]}`)
      .returns(Promise.resolve({ data: { balance: 10000000000000000000, nonce: -1 } }))
    sinon
      .stub(axios, 'post')
      .withArgs(`/`)
      .returns(Promise.resolve({ tx_hash: 'tx_hash' }))
  }
  public noBalanceStub(testProtocolSpec: TestProtocolSpec, protocol: CosmosProtocol) {
    sinon
      .stub(protocol, 'getBalanceOfAddresses')
      .withArgs([testProtocolSpec.wallet.addresses[0]])
      .returns(Promise.resolve(new BigNumber(0)))
  }
}
