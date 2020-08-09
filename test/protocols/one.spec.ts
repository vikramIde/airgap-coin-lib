import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import 'mocha'
// import * as sinon from 'sinon'

// import axios from '../../src/dependencies/src/axios-0.19.0/index'
// import BigNumber from '../../src/dependencies/src/bignumber.js-9.0.0/bignumber'
// import { RawHarmonyTransaction } from '../../src/serializer/types'

import { ONETestProtocolSpec } from './specs/one'

// use chai-as-promised plugin
chai.use(chaiAsPromised)
const expect = chai.expect

const protocol = new ONETestProtocolSpec()
// const lib = protocol.lib
const itIf = (condition, title, test) => {
    return condition ? it(title, test) : it.skip(title, test)
}
describe(`ICoinProtocol Harmony - Custom Tests`, async () => {
    console.log('Harmony Custom Test Start')
    
    it('should getPublicKeyFromMnemonic - should be able to create a public key from a corresponding mnemonic', async () => {
        const publicKey = await protocol.lib.getPublicKeyFromMnemonic(protocol.mnemonic(), protocol.lib.standardDerivationPath)
        expect(publicKey).to.equal(protocol.wallet.publicKey)
    })

    itIf(!protocol.lib.supportsHD, 'getPrivateKeyFromMnemonic - should be able to create a private key from a mnemonic', async () => {
        const privateKey = await protocol.lib.getPrivateKeyFromMnemonic(protocol.mnemonic(), protocol.lib.standardDerivationPath)

        // check if privateKey is a Buffer
        expect(privateKey).to.be.instanceof(Buffer)

        // check if privateKey matches to supplied one
        expect(privateKey.toString('hex')).to.equal(protocol.wallet.privateKey)
    })
    console.log('Harmony Custom Test End')

})
