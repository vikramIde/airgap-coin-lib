export class EstimateGasQuery {
    constructor() { }

    public toJSONBody(): string {
        return JSON.stringify(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "hmyv2_estimateGas",
                "params": []
            }
        )
    }
}
