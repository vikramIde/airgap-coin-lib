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

    itIf(
        protocol.lib.supportsHD,
        'getExtendedPrivateKeyFromMnemonic - should be able to create ext private key from mnemonic',
        async () => {
            const privateKey = await protocol.lib.getExtendedPrivateKeyFromMnemonic(protocol.mnemonic(), protocol.lib.standardDerivationPath)

            // check if privateKey matches to supplied one
            expect(privateKey).to.equal(protocol.wallet.privateKey)
        }
    )
    
    itIf(
        !protocol.lib.supportsHD,
        'getAddressFromPublicKey - should be able to create a valid address from a supplied publicKey',
        async () => {
            const publicKey = await protocol.lib.getPublicKeyFromMnemonic(protocol.mnemonic(), protocol.lib.standardDerivationPath)
            const address = await protocol.lib.getAddressFromPublicKey(publicKey)

            // check if address format matches
            expect(address.match(new RegExp(protocol.lib.addressValidationPattern))).not.to.equal(null)

            // check if address matches to supplied one
            expect(address).to.equal(protocol.wallet.addresses[0], 'address does not match')
        }
    )

    itIf(
        protocol.lib.supportsHD,
        'getAddressFromExtendedPublicKey - should be able to create a valid address from ext publicKey',
        async () => {
            const publicKey = await protocol.lib.getPublicKeyFromMnemonic(protocol.mnemonic(), protocol.lib.standardDerivationPath)
            const address = await protocol.lib.getAddressFromExtendedPublicKey(publicKey, 0, 0)

            // check if address format matches
            expect(address.match(new RegExp(protocol.lib.addressValidationPattern))).not.to.equal(null)

            // check if address matches to supplied one
            expect(address).to.equal(protocol.wallet.addresses[0], 'address does not match')
        }
    )

    itIf(!protocol.lib.supportsHD, 'getTransactionsFromAddresses - Is able to get list of tx using its address key', async () => {
        const txList = await protocol.lib.getTransactionsFromAddresses(
            ["one15u5kn5k26tl7vla334m0w72ghjxkzddgw7mtuk"]
        )

        console.log(txList)
    })
    // itIf(!protocol.lib.supportsHD, 'prepareTransactionFromPublicKey - Is able to prepare a tx using its public key', async () => {
    //     const preparedTx = await protocol.lib.prepareTransactionFromPublicKey(
    //         protocol.wallet.publicKey,
    //         protocol.txs[0].to,
    //         [protocol.txs[0].amount],
    //         protocol.txs[0].fee
    //     )

    //     protocol.txs.forEach((tx) => {
    //         // if (tx.properties) {
    //         //     tx.properties.forEach((property) => {
    //         //         expect(preparedTx).to.have.property(property)
    //         //     })
    //         // }
    //         expect(preparedTx).to.deep.include(tx.unsignedTx)
    //     })
    // })

})
