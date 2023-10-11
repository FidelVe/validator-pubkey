const IconService = require("icon-sdk-js");
const customRequest = require("./customRequest");
const elliptic = require("elliptic");
const { ec } = elliptic;
const ecdsa = new ec("secp256k1");
const base64 = require("base64-js");
const config = require("./config");
const fs = require("fs");
const {
  decodeBytes,
  intFromUint8Array,
  bytesToBigInt,
  BLOCK,
  VOTES,
  VOTEITEM,
  uint8ArrayToHex,
  encode
} = require("./rlp2");
const sha3_256 = require("js-sha3").sha3_256;

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
    console.log(WALLET.getAddress());
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

async function getLastBlock() {
  try {
    return await ICON_SERVICE.getLastBlock().execute();
  } catch (e) {
    console.log("Error getting last block", e);
    throw new Error("Error getting last block");
  }
}

async function getBlockByHeight(height) {
  try {
    return await ICON_SERVICE.getBlockByHeight(height).execute();
  } catch (e) {
    console.log("Error getting block by height", e);
    throw new Error("Error getting block by height");
  }
}

async function getDataByHash(hash) {
  try {
    return await ICON_SERVICE.getDataByHash(hash).execute();
  } catch (e) {
    console.log("Error getting data by hash", e);
    throw new Error("Error getting data by hash");
  }
}

async function getVotesByHeight(height) {
  try {
    return await ICON_SERVICE.getVotesByHeight(height).execute();
  } catch (e) {
    console.log("Error getting vote by height", e);
    throw new Error("Error getting votes by height");
  }
}

async function getBlockHeaderByHeight(height) {
  try {
    return await ICON_SERVICE.getBlockHeaderByHeight(height).execute();
  } catch (e) {
    console.log("Error getting block header by Height", e);
    throw new Error("Error getting block header by height");
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

function recoverPubKey(sign, hash, compressed = true) {
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
  const recoveredPubKeyHex = recoveredPubKey.encode("hex", compressed);

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

async function checkVotes(height) {
  try {
    if (typeof height !== "string") {
      throw new Error("height must be a hex string");
    } else if (!height.startsWith("0x")) {
      throw new Error("height must be a hex string");
    }

    let useHeight = height;
    let lastBlock = await getLastBlock();
    let votes = null;
    if (useHeight == null) {
      useHeight = lastBlock.height.toString("hex");
    }

    const blockHeader = await getBlockHeaderByHeight(useHeight);
    const headerAsBuffer = Buffer.from(blockHeader, "base64");
    const headerAsUint8Array = Uint8Array.from(headerAsBuffer);
    const headerDecoded = decodeBytes(headerAsUint8Array);
    const hashedHeader = "0x" + sha3_256(headerAsUint8Array);

    if (parseInt(useHeight) < parseInt(lastBlock.height)) {
      const nextBlockHeader = await getBlockHeaderByHeight(
        parseInt(useHeight) + 1
      );
      const nextHeaderAsBuffer = Buffer.from(nextBlockHeader, "base64");
      const nextHeaderAsUint8Array = Uint8Array.from(nextHeaderAsBuffer);
      const nextHeaderDecoded = decodeBytes(nextHeaderAsUint8Array);
      const voteAsBytes = nextHeaderDecoded[BLOCK.VOTES_HASH];
      const voteHash = uint8ArrayToHex(voteAsBytes);
      votes = await getDataByHash(voteHash);
    } else {
      votes = await getVotesByHeight(useHeight);
    }

    const voteAsBuffer = Buffer.from(votes, "base64");
    const voteAsUint8Array = Uint8Array.from(voteAsBuffer);
    const voteDecoded = decodeBytes(voteAsUint8Array);

    const votedResults = [];
    for (const voteItem of voteDecoded[VOTES.ITEMS]) {
      const sig = voteItem[VOTEITEM.SIGNATURE];
      const sigAsBuffer = Buffer.from(sig);
      const sigAsB64 = sigAsBuffer.toString("base64");

      const FOO = Uint8Array.from(["0x01"]);
      const voteMsg = encode([
        headerDecoded[BLOCK.HEIGHT],
        voteDecoded[VOTES.ROUND],
        FOO,
        hashedHeader,
        voteDecoded[VOTES.PARTSET_ID],
        voteItem[VOTEITEM.TIMESTAMP]
      ]);
      const voteHash = "0x" + sha3_256(voteMsg);
      const pubKey = recoverPubKey(sigAsB64, voteHash.substring(2));
      const pubKeyUncompressed = recoverPubKey(
        sigAsB64,
        voteHash.substring(2),
        false
      ).slice(2);
      const pubKeyAsBuffer = hexKeyToBuffer(pubKeyUncompressed);
      const address = "hx" + sha3_256(pubKeyAsBuffer).slice(-40);
      votedResults.push([address, pubKey]);
    }
    return votedResults;
  } catch (e) {
    console.log("error checking votes");
    console.log(e.message);
    return null;
  }
}

function hexKeyToBuffer(key) {
  let keyAsBuffer = null;

  try {
    keyAsBuffer = Buffer.from(key, "hex");
  } catch (err) {
    console.log("Unexpected error parsing private key into buffer");
    console.log(err);
  }

  return keyAsBuffer;
}

function saveLog(data, logPath) {
  try {
    const oldData = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    oldData.push(data);
    fs.writeFileSync(logPath, JSON.stringify(oldData));
  } catch (e) {
    console.log("error saving log");
    console.log(e);
  }
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
  registerPRepNodePublicKey2,
  getLastBlock,
  getBlockByHeight,
  getBlockHeaderByHeight,
  checkVotes,
  saveLog
};
