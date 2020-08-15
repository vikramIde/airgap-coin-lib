import * as sinon from 'sinon'
import BigNumber from '../../../src/dependencies/src/bignumber.js-9.0.0/bignumber'
import { HarmonyProtocol } from '../../../src'
import { ProtocolHTTPStub, TestProtocolSpec } from '../implementations'

export class HarmonyProtocolStub implements ProtocolHTTPStub {
  public registerStub(testProtocolSpec: TestProtocolSpec, protocol: HarmonyProtocol) {
    sinon
      .stub(protocol, 'getBalanceOfAddresses')
      .withArgs(testProtocolSpec.wallet.addresses[0])
      .returns(Promise.resolve(new BigNumber(0)))
  }
  public noBalanceStub(testProtocolSpec: TestProtocolSpec, protocol: HarmonyProtocol) {
    sinon
      .stub(protocol, 'getBalanceOfAddresses')
      .withArgs([testProtocolSpec.wallet.addresses[0]])
      .returns(Promise.resolve(new BigNumber(0)))
  }
}
