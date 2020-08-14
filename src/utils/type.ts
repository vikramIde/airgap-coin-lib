import BigNumber from '../dependencies/src/bignumber.js-9.0.0/bignumber'

export function isRecord(obj: unknown): obj is Record<string, any> {
  return (
    obj instanceof Object &&
    !Array.isArray(obj) &&
    !Buffer.isBuffer(obj) &&
    !BigNumber.isBigNumber(obj) &&
    Object.values(obj).every((value) => typeof value !== 'function')
  )
}
/**
 * [isString verify param is a String]
 * @param  {any}  obj [value]
 * @return {Boolean}     [boolean]
 */
export const isString = (obj: any): boolean => {
  return obj === `${obj}`;
};