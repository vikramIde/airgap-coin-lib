export enum MainProtocolSymbols {
  AE = 'ae',
  BTC = 'btc',
  ETH = 'eth',
  XTZ = 'xtz',
  GRS = 'grs',
  COSMOS = 'cosmos',
  POLKADOT = 'polkadot',
  KUSAMA = 'kusama',
  ONE = 'one'
}

export enum SubProtocolSymbols {
  XTZ_KT = 'xtz-kt',
  XTZ_BTC = 'xtz-btc',
  XTZ_USD = 'xtz-usd',
  XTZ_STKR = 'xtz-stkr',
  // ONE_HRC20 = 'one-hrc20',
  ETH_ERC20 = 'eth-erc20'
}

export type ProtocolSymbols = MainProtocolSymbols | SubProtocolSymbols
