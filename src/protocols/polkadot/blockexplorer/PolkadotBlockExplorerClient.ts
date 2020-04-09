import { IAirGapTransaction } from '../../../interfaces/IAirGapTransaction'
import axios from '../../../dependencies/src/axios-0.19.0'
import { PolkadotAddress } from '../data/account/PolkadotAddress'

export class PolkadotBlockExplorerClient {
    public accountInfoUrl = `${this.baseUrl}/account`
    public transactionInfoUrl = `${this.baseUrl}/extrinsic`

    constructor(
        readonly baseUrl: string,
        readonly apiUrl: string
    ) {}

    public async getTransactions(address: string, size: number, pageNumber: number): Promise<Partial<IAirGapTransaction[]>> {
        const response = await axios.get(`${this.apiUrl}/balances/transfer?&filter[address]=${address}&page[size]=${size}&page[number]=${pageNumber}`)
        return response.data.data
            .filter(transfer => transfer.type === 'balancetransfer')
            .map(transfer => {
                const destination = PolkadotAddress.fromPublicKey(transfer.attributes.destination.id).toString()
                return {
                    from: [PolkadotAddress.fromPublicKey(transfer.attributes.sender.id).toString()],
                    to: [destination],
                    isInbound: address.includes(destination),
                    amount: transfer.attributes.value,
                    fee: transfer.attributes.fee,
                    hash: transfer.id,
                    blockHeight: transfer.attributes.block_id
                }
            })
    }
}