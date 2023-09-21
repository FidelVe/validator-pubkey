const {
  getPReps,
  WALLET,
  getPublicKey,
  getPRepNodePublicKey,
  sliceAddress,
  registerPRepNodePublicKey,
  registerPRepNodePublicKey2,
  getTxResult,
  sleep,
  recoverPubKeyByAddress
} = require("./utils/lib");

async function main() {
  const preps = await getPReps();
  const onlyMainPreps = preps.preps.filter(p => p.grade === "0x0");
  // const onlyMainPreps = preps.preps;
  const prepsSorted = {
    withPubKey: [],
    withoutPubKey: []
  };
  // const maxPreps = 4;
  const maxPreps = null;
  let count = 0;
  for (const w of onlyMainPreps) {
    const address = w.address;
    const slicedAddress = sliceAddress(address);
    const prepNodePublicKey = await getPRepNodePublicKey(address);
    const recoveredPubKey = await recoverPubKeyByAddress(address);
    if (prepNodePublicKey) {
      prepsSorted.withPubKey.push({
        prep: w,
        pubKey: prepNodePublicKey,
        recoveredPubKey: recoveredPubKey
      });
    } else {
      prepsSorted.withoutPubKey.push({
        prep: w,
        pubKey: prepNodePublicKey,
        recoveredPubKey: recoveredPubKey
      });
      count += 1;
    }
    if (maxPreps && count >= maxPreps) {
      break;
    }
  }

  console.log("\n>--------------------------------");
  console.log("> Preps with registered PubKey: ");
  prepsSorted.withPubKey.forEach(p => {
    console.log(
      `Prep: ${p.prep.name}.\nPrep address: ${p.prep.address}.\nPubKey: ${p.pubKey}.\nRecovered PubKey: ${p.recoveredPubKey}.\n###`
    );
  });
  console.log("\n>--------------------------------");
  console.log("> Preps without registered PubKey: ");
  prepsSorted.withoutPubKey.forEach(p => {
    console.log(
      `Prep: ${p.prep.name}.\nPrep address: ${p.prep.address}.\nPubKey: ${p.pubKey}.\nRecovered PubKey: ${p.recoveredPubKey}.\n###`
    );
  });

  const RUN_REGISTRATION = false;
  if (RUN_REGISTRATION) {
    for (const v of prepsSorted.withoutPubKey) {
      // register prep node public key
      const pubKey = "0x" + v.recoveredPubKey;
      const address = v.prep.address;
      const txHash = await registerPRepNodePublicKey2(pubKey, address);
      // print tx hash
      console.log(`> TxHash: ${txHash}`);
      // wait for tx result
      const txResult = await getTxResult(txHash);
      console.log(`> TxResult:`);
      console.log(txResult);
    }

    // wait for new block
    await sleep(3000);

    // getting all prep info
    const request = await getPReps();
    // print all updated prep info
    console.log("> preps: ", request);
  }
}

main();
