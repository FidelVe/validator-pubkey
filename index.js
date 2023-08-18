const {
  getPReps,
  WALLET,
  WALLET_2,
  getPublicKey,
  getPRepNodePublicKey,
  sliceAddress,
  registerPRepNodePublicKey,
  getTxResult,
  sleep
} = require("./lib");

async function main() {
  const preps = await getPReps();
  console.log("> preps: ", preps);
  const wallet = [WALLET, WALLET_2];
  for (const w of wallet) {
    console.log("\n>--------------------------------");
    const publicKey = getPublicKey(w);
    const slicedPublicKey = sliceAddress(publicKey);
    const address = w.getAddress();
    const slicedAddress = sliceAddress(address);
    console.log(`> Public key of wallet ${slicedAddress}: ${slicedPublicKey}`);
    const prepNodePublicKey = await getPRepNodePublicKey(address);
    const slicedPrepNodePublicKey = sliceAddress(prepNodePublicKey);
    console.log(
      `> PRep node public key of wallet ${slicedAddress}: ${slicedPrepNodePublicKey}`
    );

    // if prep doesnt have a registered prep node public key
    if (prepNodePublicKey == null) {
      console.log(
        `Prep ${slicedAddress} doesnt have a registered Prep node Public Key. Registering...`
      );
      // register prep node public key
      const txHash = await registerPRepNodePublicKey(w);
      // print tx hash
      console.log(`> TxHash: ${txHash}`);
      // wait for tx result
      const txResult = await getTxResult(txHash);
      console.log(`> TxResult:`);
      console.log(txResult);

      // wait for new block
      await sleep(3000);

      // getting all prep info
      const preps = await getPReps();
      // print all updated prep info
      console.log("> preps: ", preps);
    }
  }
}

main();
