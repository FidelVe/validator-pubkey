const IconService = require("icon-sdk-js");
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
const WALLET_2 = IconWallet.loadPrivateKey(config.config.pk.b);

async function registerPRepNodePublicKey(wallet) {
  try {
    const params = {
      params: {
        pubKey: getPublicKey(wallet),
        address: wallet.getAddress()
      },
      from: wallet.getAddress(),
      to: config.contract.chain,
      stepLimit: IconConverter.toBigNumber(20000000),
      nid: config.config.nid,
      nonce: IconConverter.toBigNumber(1),
      version: IconConverter.toBigNumber(3),
      method: "registerPRepNodePublicKey"
    };
    console.log("params:", params);

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
module.exports = {
  getPReps,
  getPRep,
  WALLET,
  WALLET_2,
  getPublicKey,
  getPRepNodePublicKey,
  sliceAddress,
  registerPRepNodePublicKey,
  getTxResult,
  sleep
};
