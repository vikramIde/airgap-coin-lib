export class BalanceQuery {
  constructor(private readonly address: string) {}

  public toJSONBody(): string {
    return JSON.stringify(
      {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "hmyv2_getBalance",
        "params": [
          this.address
        ]
      }
    )
  }
}
