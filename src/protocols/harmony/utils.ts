/**
 * @packageDocumentation
 * @module harmony-transaction
 * @hidden
 */

// import { async } from "../../dependencies/src/validate.js-0.13.1/validate";

const { hexToNumber, isHex, isAddress, add0xToString, strip0x, AddressSuffix } = require('@harmony-js/utils');

const {
    decode,
    encode,
    keccak256,
    hexlify,
    BN,
    sign,
    hexZeroPad,
    recoverAddress,
    getAddress,
    arrayify,
    stripZeros,
    splitSignature
} = require("@harmony-js/crypto")
const  {
    RPCMethod,
    Messenger,
    HttpProvider
} = require('@harmony-js/network')

export const transactionFields = [
    { name: 'nonce', length: 32, fix: false },
    { name: 'gasPrice', length: 32, fix: false, transform: 'hex' },
    { name: 'gasLimit', length: 32, fix: false, transform: 'hex' },
    { name: 'shardID', length: 16, fix: false },
    // recover it after main repo fix
    { name: 'toShardID', length: 16, fix: false },
    { name: 'to', length: 20, fix: true },
    { name: 'value', length: 32, fix: false, transform: 'hex' },
    { name: 'data', fix: false, length: 45 },
    // { name: 'from', length: 20, fix: true }

];

export const handleNumber = (value) => {
    if (isHex(value) && value === '0x') {
        return hexToNumber('0x00');
    } else if (isHex(value) && value !== '0x') {
        return hexToNumber(value);
    } else {
        return value;
    }
};

export const handleAddress = (value) => {
    if (value === '0x') {
        return '0x';
    } else if (isAddress(value)) {
        return value;
    } else {
        return '0x';
    }
};

export const recover = (rawTransaction: string) => {
    const transaction = decode(rawTransaction);
    const tx = {
        id: '0x',
        from: '0x',
        blockNumber:'0x',
        blockHash:'0x',
        rawTransaction: '0x',
        unsignedRawTransaction: '0x',
        nonce: new BN(strip0x(handleNumber(transaction[0]))).toNumber(),
        gasPrice: new BN(strip0x(handleNumber(transaction[1]))),
        gasLimit: new BN(strip0x(handleNumber(transaction[2]))),
        shardID: new BN(strip0x(handleNumber(transaction[3]))).toNumber(),
        toShardID: new BN(strip0x(handleNumber(transaction[4]))).toNumber(),
        to:
            handleAddress(transaction[5]) !== '0x'
                ? getAddress(handleAddress(transaction[5])).checksum
                : '0x',
        value: new BN(strip0x(handleNumber(transaction[6]))),
        data: transaction[7],
        chainId: 0,
        signature: {
            r: '',
            s: '',
            recoveryParam: 0,
            v: 0,
        },
    };

    // Legacy unsigned transaction
    if (transaction.length === 8) {
        tx.unsignedRawTransaction = rawTransaction;
        return tx;
    }

    try {
        tx.signature.v = new BN(strip0x(handleNumber(transaction[8]))).toNumber();
    } catch (error) {
        throw error;
    }

    tx.signature.r = hexZeroPad(transaction[9], 32);
    tx.signature.s = hexZeroPad(transaction[10], 32);

    if (
        new BN(strip0x(handleNumber(tx.signature.r))).isZero() &&
        new BN(strip0x(handleNumber(tx.signature.s))).isZero()
    ) {
        // EIP-155 unsigned transaction
        tx.chainId = tx.signature.v;
        tx.signature.v = 0;
    } else {
        // Signed Tranasaction

        tx.chainId = Math.floor((tx.signature.v - 35) / 2);
        if (tx.chainId < 0) {
            tx.chainId = 0;
        }

        let recoveryParam = tx.signature.v - 27;

        const raw = transaction.slice(0, 8);

        if (tx.chainId !== 0) {
            raw.push(hexlify(tx.chainId));
            raw.push('0x');
            raw.push('0x');
            recoveryParam -= tx.chainId * 2 + 8;
        }

        const digest = keccak256(encode(raw));
        try {
            const recoveredFrom = recoverAddress(digest, {
                r: hexlify(tx.signature.r),
                s: hexlify(tx.signature.s),
                recoveryParam,
            });
            tx.from = recoveredFrom === '0x' ? '0x' : getAddress(recoveredFrom).checksum;
        } catch (error) {
            throw error;
        }
        tx.rawTransaction = rawTransaction;
        tx.id = keccak256(rawTransaction);
    }
    // console.log(tx, 'rawTransaction')

    return tx;
};



export const sleep = async (ms) =>
    new Promise((resolve) => {
        setTimeout(() => resolve(), ms);
    });

// export enum TransactionEvents {
//     transactionHash = 'transactionHash',
//     error = 'error',
//     confirmation = 'confirmation',
//     receipt = 'receipt',
//     track = 'track',
//     cxConfirmation = 'cxConfirmation',
//     cxReceipt = 'cxReceipt',
//     cxTrack = 'cxTrack',
// }


/**
   *
   * @example
   * ```javascript
   * const unsigned = txn.getRLPUnsigned(txn);
   * console.log(unsigned);
   * ```
   */
export const getRLPUnsigned = (txParams: any): [string, any[]] => {
    const raw: Array<string | Uint8Array> = [];
    // console.log(txParams, 'txParams')

    // temp setting to be compatible with eth
    const fields = transactionFields;
    fields.forEach((field) => {
        let value = (txParams)[field.name] || [];
        value = arrayify(
            hexlify(field.transform === 'hex' ? add0xToString(value.toString(16)) : value),
        );

        // Fixed-width field
        if (field.fix === true && field.length && value.length !== field.length && value.length > 0) {
            throw new Error(`invalid length for ${field.name}`);
        }

        // Variable-width (with a maximum)
        if (field.fix === false && field.length) {
            value = stripZeros(value);
            if (value.length > field.length) {
                throw new Error(`invalid length for ${field.name}`);
            }
        }

        raw.push(hexlify(value));
    });

    if (txParams.chainId != null && txParams.chainId !== 0) {
        raw.push(hexlify(txParams.chainId));
        raw.push('0x');
        raw.push('0x');
    }
    // console.log(raw)
    return [encode(raw), raw];
}

export const RLPSign = (unsignedRawTransaction: string, prv: string):string  => {
    const raw = decode(unsignedRawTransaction)
    const signature = sign(keccak256(unsignedRawTransaction), prv);
    const signed = getRLPSigned(raw, signature);
    return signed;
}
export const sendRawTx = async (signedTx: string,url:string,shardId:string) => {
    let shardID = shardId //take it as dynamic
    let messenger = new Messenger(
        new HttpProvider(url)
    )
    // console.log(RPCMethod)
    const result = await messenger.send(
        RPCMethod.SendRawTransaction,
        [signedTx],
        'hmy',
        typeof shardID === 'string'
            ? Number.parseInt(shardID, 10)
            : shardID,
    );
    // console.log(result)
    return result;

}

export const getShardBalance = async (address:string, shardID: number, url: string, blockNumber: string = 'latest') => {
    
    let messenger = new Messenger(
        new HttpProvider(url)
    )

    const balance = await messenger.send(
        RPCMethod.GetBalance,
        [address, blockNumber],
        'hmy',
        shardID,
    );

    const nonce = await messenger.send(
        RPCMethod.GetTransactionCount,
        [address, blockNumber],
        'hmy',
        shardID,
    );

    if (balance.isError()) {
        throw balance.error.message;
    }
    if (nonce.isError()) {
        throw nonce.error.message;
    }
    return {
        address: `${address}${AddressSuffix}${shardID}`,
        balance: hexToNumber(balance.result),
        nonce: Number.parseInt(hexToNumber(nonce.result), 10),
    };
}
function getRLPSigned(raw: any[], signature: string): string {

    // temp setting to be compatible with eth
    const rawLength = 11;
    const chainId = 2
    const sig = splitSignature(signature);
    let v = 27 + (sig.recoveryParam || 0);
    if (raw.length === rawLength) {
        raw.pop();
        raw.pop();
        raw.pop();
        v += chainId * 2 + 8;
    }

    raw.push(hexlify(v));
    raw.push(stripZeros(arrayify(sig.r) || []));
    raw.push(stripZeros(arrayify(sig.s) || []));

    return encode(raw);
}

