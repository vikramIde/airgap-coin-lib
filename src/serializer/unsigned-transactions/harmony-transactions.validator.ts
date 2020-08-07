import { async } from '../../dependencies/src/validate.js-0.13.1/validate'
import { UnsignedHarmonyTransaction } from '../schemas/definitions/transaction-sign-request-harmony'
import { SignedHarmonyTransaction } from '../schemas/definitions/transaction-sign-response-harmony'
import { RawHarmonyTransaction } from '../types'
import { TransactionValidator } from '../validators/transactions.validator'
import { validateSyncScheme } from '../validators/validators'

const unsignedTransactionConstraints = {
  transaction: {
    presence: { allowEmpty: false },
    type: 'String',
    isValidHarmonyTx: true
  },
  networkId: {
    presence: { allowEmpty: false },
    type: 'String',
    isMainNet: true
  }
}
const signedTransactionConstraints = {
  transaction: {
    presence: { allowEmpty: false },
    type: 'String',
    isValidHarmonyTx: true
  },
  accountIdentifier: {
    presence: { allowEmpty: false },
    type: 'String'
  }
}
const success = () => undefined
const error = (errors) => errors

export class HarmonyTransactionValidator extends TransactionValidator {
  public validateUnsignedTransaction(unsignedTx: UnsignedHarmonyTransaction): Promise<any> {
    const rawTx: RawHarmonyTransaction = unsignedTx.transaction
    validateSyncScheme({})

    return async(rawTx, unsignedTransactionConstraints).then(success, error)
  }
  public async validateSignedTransaction(signedTx: SignedHarmonyTransaction): Promise<any> {
    return async(signedTx, signedTransactionConstraints).then(success, error)
  }
}
