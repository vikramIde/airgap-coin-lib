import { ProtocolBlockExplorer } from '../../utils/ProtocolBlockExplorer'
import { NetworkType, ProtocolNetwork } from '../../utils/ProtocolNetwork'
import { ProtocolOptions } from '../../utils/ProtocolOptions'

// tslint:disable:max-classes-per-file

const MAINNET_NAME: string = 'Mainnet'

// const NODE_URL: string = 'https://api.s0.t.hmny.io'
const NODE_URL: string = 'https://api.s0.b.hmny.io'

const BLOCK_EXPLORER_URL: string = 'https://explorer.pops.one'

export class HarmonyBlockExplorer implements ProtocolBlockExplorer {
  constructor(public readonly blockExplorer: string = BLOCK_EXPLORER_URL) {}

  public async getAddressLink(address: string): Promise<string> {
    return `${this.blockExplorer}/address/${address}`
  }
  public async getTransactionLink(transactionId: string): Promise<string> {
    return `${this.blockExplorer}/#/tx/${transactionId}`
  }
}

export class HarmonyProtocolNetwork extends ProtocolNetwork<undefined> {
  constructor(
    name: string = MAINNET_NAME,
    type: NetworkType = NetworkType.MAINNET,
    rpcUrl: string = NODE_URL,
    blockExplorer: ProtocolBlockExplorer = new HarmonyBlockExplorer(),
    // tslint:disable-next-line:no-unnecessary-initializer
    extras: undefined = undefined
  ) {
    super(name, type, rpcUrl, blockExplorer, extras)
  }
}

export class HarmonyProtocolOptions implements ProtocolOptions<undefined> {
  constructor(
    public readonly network: HarmonyProtocolNetwork = new HarmonyProtocolNetwork(),
    // tslint:disable-next-line:no-unnecessary-initializer
    public readonly config: undefined = undefined
  ) {}
}
