import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import 'mocha'
import * as sinon from 'sinon'

import axios from '../../src/dependencies/src/axios-0.19.0/index'
import BigNumber from '../../src/dependencies/src/bignumber.js-9.0.0/bignumber'
import { RawHarmonyTransaction } from '../../src/serializer/types'

import { ONETestProtocolSpec } from './specs/one'

// use chai-as-promised plugin
chai.use(chaiAsPromised)
const expect = chai.expect

const protocolSpec = new ONETestProtocolSpec()
const oneLib = protocolSpec.lib

describe(`ICoinProtocol Harmony - Custom Tests`, () => {
  console.log('Hi world!')
})
