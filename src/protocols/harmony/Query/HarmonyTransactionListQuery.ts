export class TransactionListQuery {
  constructor(private readonly offset: number, private readonly limit: number, private readonly address: string) {}

  public toJSONBody(): string {
    return JSON.stringify(
      {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "hmyv2_getTransactionsHistory",
        "params": [
          {
            "address": this.address,
            "pageIndex": this.offset,
            "pageSize": this.limit,
            "fullTx": true,
            "txType": "ALL",
            "order": "DESC"
          }
        ]
      }
      )
  }
}
