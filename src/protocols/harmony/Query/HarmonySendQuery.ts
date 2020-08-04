export class SendQuery {
    constructor(private readonly signedTx: string) { }

    public toJSONBody(): string {
        return JSON.stringify(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "hmyv2_sendRawTransaction",
                "params": [
                    this.signedTx
                ]
            }
        )
    }
}
