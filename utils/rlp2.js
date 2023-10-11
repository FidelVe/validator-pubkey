const BLOCK = {
  VERSION: 0,
  HEIGHT: 1,
  TIMESTAMP: 2,
  PROPOSER: 3,
  PREVIOUS_ID: 4,
  VOTES_HASH: 5,
  NEXT_VALIDATORS_HASH: 6,
  PATCH_TX_HASH: 7,
  NORMAL_TX_HASH: 8,
  LOGS_BLOOM: 9,
  RESULT: 10
};

const VOTES = {
  ROUND: 0,
  PARTSET_ID: 1,
  ITEMS: 2
};

const VOTEITEM = {
  TIMESTAMP: 0,
  SIGNATURE: 1
};

function intToUint8Array(number, size, byteorder = "big", signed = false) {
  if (size <= 0) {
    throw new Error("Size must be a positive integer.");
  }

  if (signed && number < 0) {
    throw new Error("Cannot represent negative numbers with signed bytes.");
  }

  if (byteorder !== "big" && byteorder !== "little") {
    throw new Error('Invalid byteorder. Use "big" or "little".');
  }

  const uint8Array = new Uint8Array(size);
  let index = byteorder === "big" ? 0 : size - 1;
  const step = byteorder === "big" ? 1 : -1;

  for (let i = 0; i < size; i++) {
    uint8Array[index] = number & 0xff;
    number >>= 8;
    index += step;
  }

  return uint8Array;
}

// Example usage:
// const number = 300;
// const size = 2;
// const byteorder = 'big';
// const signed = false;
//
// const uint8Array = intToUint8Array(number, size, byteorder, signed);
// console.log(uint8Array); // Output: Uint8Array [ 1, 44 ]
//
function bitLength(n) {
  if (n === 0) {
    return 0;
  } else {
    return Math.floor(Math.log2(Math.abs(n))) + 1;
  }
}

function encodeBytes(obj) {
  const length = obj.length;
  if (length == 1 && obj[0] < 0x80) {
    return obj;
  } else if (length < 56) {
    return new Uint8Array([0x80 + length, ...obj]);
  } else {
    const tagSize = Math.floor((bitLength(length) + 7) / 8);
    const head = new Uint8Array([0x80 + 55 + tagSize]);
    const tag = intToUint8Array(length, tagSize);
    return new Uint8Array([...head, ...tag, ...obj]);
  }
}

function encode(obj) {
  if (obj == null) {
    return new Uint8Array([0xf8, 0x00]);
  } else if (obj instanceof Uint8Array) {
    return encodeBytes(obj);
  } else if (typeof obj === "string") {
    if (obj.startsWith("0x")) {
      return encodeBytes(Uint8Array.from(Buffer.from(obj.slice(2), "hex")));
    } else {
      throw new Error(`Invalid string: ${obj}`);
    }
  } else if (typeof obj === "number") {
    return encodeBytes(intToUint8Array(obj));
  } else if (Array.isArray(obj)) {
    let bs = new Uint8Array();
    for (const item of obj) {
      bs = new Uint8Array([...bs, ...encode(item)]);
    }
    const length = bs.length;
    if (length < 56) {
      return new Uint8Array([0xc0 + length, ...bs]);
    } else {
      const tagSize = Math.floor((bitLength(length) + 7) / 8);
      const head = new Uint8Array([0xf7 + tagSize]);
      const tag = intToUint8Array(length, tagSize);
      return new Uint8Array([...head, ...tag, ...bs]);
    }
  } else {
    throw new Error(`Unsupported type: ${typeof obj}`);
  }
}
// function encode(obj) {
//   if (typeof obj === "number") {
//     return encodeBytes(intToUint8Array(obj));
//   } else if (typeof obj === "string") {
//     return encodeBytes(new TextEncoder().encode(obj));
//   } else if (Array.isArray(obj)) {
//     const items = obj.map(encode);
//     const length = items.reduce((sum, item) => sum + item.length, 0);
//     if (length < 56) {
//       return new Uint8Array([0xc0 + length, ...items.flat()]);
//     } else {
//       const tagSize = Math.floor((bitLength(length) + 7) / 8);
//       const head = new Uint8Array([0xf7 + tagSize]);
//       const tag = intToUint8Array(length, tagSize);
//       return new Uint8Array([...head, ...tag, ...items.flat()]);
//     }
//   } else {
//     throw new Error(`Unsupported type: ${typeof obj}`);
//   }
// }

function decodeBytes(bs) {
  const [obj, newBs] = decodeOneBytes(bs);
  if (newBs.length > 0) {
    throw new Error(`Remaining bytes (size): ${newBs.length}`);
  }
  return obj;
}

function decodeOneBytes(bs) {
  const ch = new Uint8Array([bs[0]]);
  const newBs = bs.slice(1);
  if (ch[0] < 0x80) {
    return [ch, newBs];
  } else if (ch[0] < 0xb8) {
    const len = ch[0] - 0x80;
    return [newBs.slice(0, len), newBs.slice(len)];
  } else if (ch[0] < 0xc0) {
    const tagSize = ch[0] - 0xb7;
    const tag = newBs.slice(0, tagSize);
    const newNewBs = newBs.slice(tagSize);
    const size = bytesToInt(tag);
    return [newNewBs.slice(0, size), newNewBs.slice(size)];
  } else if (ch[0] < 0xf8) {
    const size = ch[0] - 0xc0;
    const listBytes = newBs.slice(0, size);
    const newNewBs = newBs.slice(size);
    return [decodeListBytes(listBytes), newNewBs];
  } else {
    const tagSize = ch[0] - 0xf7;
    const tag = newBs.slice(0, tagSize);
    const newNewBs = newBs.slice(tagSize);
    const size = bytesToInt(tag);
    if (size === 0) {
      return [[], newNewBs];
    }
    const listBytes = newNewBs.slice(0, size);
    const newNewNewBs = newNewBs.slice(size);
    return [decodeListBytes(listBytes), newNewNewBs];
  }
}

function decodeListBytes(bs) {
  const items = [];
  while (bs.length > 0) {
    const [item, newBs] = decodeOneBytes(bs);
    items.push(item);
    bs = newBs;
  }
  return items;
}

// Assuming 'tag' is an array of bytes (e.g., [0x12, 0x34, 0x56])
// // 'signed' is equivalent to 'false' in Python, indicating an unsigned integer.
// // 'byteorder' is equivalent to 'big' in Python, indicating big-endian byte order.
//
function bytesToInt(tag) {
  let result = 0;
  const length = tag.length;

  for (let i = 0; i < length; i++) {
    const byteValue = tag[i];
    result = (result << 8) | byteValue;
  }

  return result;
}

function intFromUint8Array(bytes, signed = false, byteorder = "big") {
  if (byteorder === "little") {
    bytes = Array.from(bytes).reverse(); // Reverse the Uint8Array for little-endian order.
  }

  let result = 0;

  for (let i = 0; i < bytes.length; i++) {
    result += bytes[i] << (8 * (bytes.length - 1 - i));
  }

  if (signed) {
    // Handle signed integers (two's complement).
    const msb = 1 << (8 * (bytes.length - 1));
    if (result >= msb) {
      result -= 2 * msb;
    }
  }

  return result;
}

function bytesToBigInt(bytes) {
  let result = 0n; // Initialize with a BigInt value of 0.

  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }

  return result;
}

function uint8ArrayToHex(uint8Array) {
  return (
    "0x" +
    Array.from(uint8Array, byte => {
      return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("")
  );
}

module.exports = {
  decodeBytes,
  bytesToInt,
  intFromUint8Array,
  bytesToBigInt,
  encode,
  BLOCK,
  VOTES,
  VOTEITEM,
  uint8ArrayToHex
};
