const IconService = require("icon-sdk-js");
const customRequest = require("./customRequest");
const elliptic = require("elliptic");
const { ec } = elliptic;
const ecdsa = new ec("secp256k1");
const base64 = require("base64-js");
const config = require("./config");

const {
  IconBuilder,
  HttpProvider,
  IconWallet,
  SignedTransaction,
  IconConverter
} = IconService.default;
const HTTP_PROVIDER = new HttpProvider(config.config.rpcUrl);
const ICON_SERVICE = new IconService.default(HTTP_PROVIDER);
const WALLET = IconWallet.loadPrivateKey(config.config.pk.a);

async function registerPRepNodePublicKey(wallet, address) {
  try {
    const params = {
      params: {
        pubKey: getPublicKey(wallet),
        address: address
      },
      from: wallet.getAddress(),
      to: config.contract.chain,
      stepLimit: IconConverter.toBigNumber(20000000),
      nid: config.config.nid,
      nonce: IconConverter.toBigNumber(1),
      version: IconConverter.toBigNumber(3),
      method: "registerPRepNodePublicKey"
    };

    const txObj = new IconBuilder.CallTransactionBuilder()
      .from(params.from)
      .to(params.to)
      .stepLimit(params.stepLimit)
      .nid(params.nid)
      .nonce(params.nonce)
      .version(params.version)
      .timestamp(new Date().getTime() * 1000)
      .method(params.method)
      .params(params.params)
      .build();

    const signedTx = new SignedTransaction(txObj, wallet);
    return await ICON_SERVICE.sendTransaction(signedTx).execute();
  } catch (e) {
    console.log("Error registering PRep node public key", e);
    throw new Error("Error registering PRep Prep node public key");
  }
}

async function registerPRepNodePublicKey2(pubKey, address) {
  try {
    const params = {
      params: {
        pubKey: pubKey,
        address: address
      },
      from: WALLET.getAddress(),
      to: config.contract.chain,
      stepLimit: IconConverter.toBigNumber(20000000),
      nid: config.config.nid,
      nonce: IconConverter.toBigNumber(1),
      version: IconConverter.toBigNumber(3),
      method: "registerPRepNodePublicKey"
    };

    const txObj = new IconBuilder.CallTransactionBuilder()
      .from(params.from)
      .to(params.to)
      .stepLimit(params.stepLimit)
      .nid(params.nid)
      .nonce(params.nonce)
      .version(params.version)
      .timestamp(new Date().getTime() * 1000)
      .method(params.method)
      .params(params.params)
      .build();

    const signedTx = new SignedTransaction(txObj, WALLET);
    return await ICON_SERVICE.sendTransaction(signedTx).execute();
  } catch (e) {
    console.log("Error registering PRep node public key", e);
    throw new Error("Error registering PRep Prep node public key");
  }
}

async function getTxResult(hash) {
  const maxLoop = 10;
  let loop = 0;
  while (loop < maxLoop) {
    try {
      return await ICON_SERVICE.getTransactionResult(hash).execute();
    } catch (e) {
      loop++;
      await sleep(1000);
    }
  }
}

async function getTxByHash(hash) {
  const maxLoop = 10;
  let loop = 0;
  while (loop < maxLoop) {
    try {
      return await ICON_SERVICE.getTransaction(hash).execute();
    } catch (e) {
      loop++;
      await sleep(1000);
    }
  }
}
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPReps() {
  try {
    return await callMethod("getPReps", config.contract.chain);
  } catch (e) {
    console.log("Error getting PReps", e);
    throw new Error("Error getting PReps");
  }
}

async function getPRep(address) {
  try {
    const params = {
      address: address
    };
    return await callMethod("getPRep", config.contract.chain, params);
  } catch (e) {
    console.log("Error getting PReps", e);
    throw new Error("Error getting PReps");
  }
}

async function getPRepNodePublicKey(address) {
  try {
    const params = {
      address: address
    };
    return await callMethod(
      "getPRepNodePublicKey",
      config.contract.chain,
      params
    );
  } catch (e) {
    console.log("Error getting PRepNodePublicKey", e);
    throw new Error("Error getting PRepNodePublicKey");
  }
}

function getPublicKey(wallet) {
  return wallet.getPublicKey(true);
}

async function callMethod(method, to, params) {
  try {
    const payload = new IconBuilder.CallBuilder()
      .to(to)
      .method(method)
      .params(params)
      .build();
    return await ICON_SERVICE.call(payload).execute();
  } catch (e) {
    console.log("Error calling method", e);
    throw new Error("Error calling method");
  }
}

function sliceAddress(address) {
  try {
    return address.slice(0, 5) + "..." + address.slice(-5);
  } catch (e) {
    return undefined;
  }
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomHex(length) {
  let hexString = "";
  const characters = "0123456789ABCDEF";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    hexString += characters.charAt(randomIndex);
  }

  return hexString;
}

function getRandomPrivateKey() {
  return getRandomHex(64);
}

function recoverPubKey(sign, hash) {
  const signatureBuffer = Buffer.from(base64.toByteArray(sign));
  const signatureHex = signatureBuffer.toString("hex");
  const signatureHexWithPrefix = "0x" + signatureHex;
  const signature = {
    r: signatureHexWithPrefix.slice(2, 66),
    s: signatureHexWithPrefix.slice(66, 130),
    v: parseInt(signatureHexWithPrefix.slice(130, 132), 16)
  };

  const transactionHash = Buffer.from(hash, "hex");
  const recoveredPubKey = ecdsa.recoverPubKey(
    transactionHash,
    signature,
    signature.v
  );
  const recoveredPubKeyHex = recoveredPubKey.encode("hex", true);

  return recoveredPubKeyHex;
}

async function fetchTxByAddress(address) {
  try {
    const response = await customRequest(
      `${config.tracker.routes.addressTransactions}${address}`,
      false,
      config.tracker[config.env]
    );
    return response;
  } catch (e) {
    console.log("error fetching transactions by address", e);
    throw new Error("error fetching transactions by address");
  }
}

async function recoverPubKeyByAddress(address) {
  const transactions = await fetchTxByAddress(address);
  if (!transactions || !transactions.length) {
    return undefined;
  }

  const transaction = transactions[0];
  const hash = transaction.hash;

  const txResult = await getTxByHash(hash);
  const { signature } = txResult;
  const pubKey = recoverPubKey(signature, hash.substring(2));
  return pubKey;
}

module.exports = {
  getPReps,
  getPRep,
  WALLET,
  getPublicKey,
  getPRepNodePublicKey,
  sliceAddress,
  registerPRepNodePublicKey,
  getTxResult,
  sleep,
  getRandomInt,
  getRandomHex,
  getRandomPrivateKey,
  recoverPubKey,
  fetchTxByAddress,
  recoverPubKeyByAddress,
  registerPRepNodePublicKey2
};