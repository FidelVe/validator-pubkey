const {
  getPReps,
  getPRep,
  WALLET,
  getPublicKey,
  getPRepNodePublicKey,
  sliceAddress,
  registerPRepNodePublicKey,
  registerPRepNodePublicKey2,
  getTxResult,
  sleep,
  recoverPubKeyByAddress,
  getLastBlock,
  getBlockByHeight,
  checkVotes
} = require("./utils/lib");

async function getPRepsList(onlyMain = false) {
  const preps = await getPReps();
  let prepArray = [];
  if (onlyMain) {
    prepArray = preps.preps.filter(p => p.grade === "0x0");
  } else {
    prepArray = preps.preps;
  }
  const prepsSorted = {
    withPubKey: [],
    withoutPubKey: []
  };
  // const maxPreps = 4;
  const maxPreps = null;
  let count = 0;
  for (const w of prepArray) {
    const address = w.address;
    const slicedAddress = sliceAddress(address);
    const prepNodePublicKey = await getPRepNodePublicKey(address);
    const recoveredPubKey = await recoverPubKeyByAddress(address);
    if (prepNodePublicKey) {
      prepsSorted.withPubKey.push({
        name: w.name,
        address: w.address,
        pubKey: prepNodePublicKey,
        recoveredPubKey: recoveredPubKey
      });
    } else {
      prepsSorted.withoutPubKey.push({
        name: w.name,
        address: w.address,
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
      `Prep: ${p.name}.\nPrep address: ${p.address}.\nPubKey: ${p.pubKey}.\nRecovered PubKey: ${p.recoveredPubKey}.\n###`
    );
  });
  console.log("\n>--------------------------------");
  console.log("> Preps without registered PubKey: ");
  prepsSorted.withoutPubKey.forEach(p => {
    console.log(
      `Prep: ${p.name}.\nPrep address: ${p.address}.\nPubKey: ${p.pubKey}.\nRecovered PubKey: ${p.recoveredPubKey}.\n###`
    );
  });

  return prepsSorted;
}

async function runRegistrationByTxHash(prepsSorted) {
  try {
    for (const v of prepsSorted.withoutPubKey) {
      // register prep node public key
      const pubKey = "0x" + v.recoveredPubKey;
      const address = v.address;
      const txHash = await registerPRepNodePublicKey2(pubKey, address);
      // print tx hash
      console.log("###");
      console.log("> Validator: ", v.name);
      console.log(`>> TxHash: ${txHash}`);
      // wait for tx result
      const txResult = await getTxResult(txHash);
      console.log(`>> TxResult status: ${txResult.status}`);
      if (txResult.status == "0") {
        console.log(`>> Failure: ${txResult.failure.message}`);
      }
    }
  } catch (e) {
    console.log("Could not register prep node public key: ");
    console.log(e);
  }
}

async function runRegistrationByBlock(prepsSorted) {
  try {
    // const arrOfMissingPreps = prepsSorted.withoutPubKey.map(p => {
    //   return p.prep.address;
    // });
    const arrOfMissingPreps = prepsSorted;
    const arrOfSignaturesOfMissingPreps = [];
    console.log("array of missing preps");
    console.log(arrOfMissingPreps);

    for (const validator of arrOfMissingPreps) {
      const block = await getBlockByHeight(validator.lastHeight);
      arrOfSignaturesOfMissingPreps.push({
        address: validator.address,
        name: validator.name,
        nodeAddress: validator.nodeAddress,
        lastHeight: validator.lastHeight,
        block: {
          ...block
        }
      });
    }

    console.log("array of signatures of missing preps");
    console.log(arrOfSignaturesOfMissingPreps);
  } catch (e) {
    console.log("Could not register prep node public key: ");
    console.log(e);
  }
}

async function runRegistrationByBlockHeader(prepArray) {
  try {
    const arrOfMissingPreps = prepArray;
    const arrOfSignaturesOfMissingPreps = [];

    for (const validator of arrOfMissingPreps) {
      let pubKeyFound = false;
      const prevBlockHeight = parseInt(validator.lastHeight) - 1;
      const pbh = "0x" + prevBlockHeight.toString(16);
      const prevBlockVotes = await checkVotes(pbh);

      if (prevBlockVotes === null) {
        arrOfSignaturesOfMissingPreps.push({
          address: validator.address,
          name: validator.name,
          nodeAddress: validator.nodeAddress,
          lastHeight: validator.lastHeight,
          addressUsed: null,
          pubKey: null
        });
        pubKeyFound = true;
        continue;
      }
      for (const votes of prevBlockVotes) {
        if (
          votes[0] === validator.address ||
          votes[0] === validator.nodeAddress
        ) {
          arrOfSignaturesOfMissingPreps.push({
            address: validator.address,
            name: validator.name,
            nodeAddress: validator.nodeAddress,
            lastHeight: validator.lastHeight,
            addressUsed:
              votes[0] === validator.address
                ? validator.address
                : validator.nodeAddress,
            pubKey: votes[1]
          });
          pubKeyFound = true;
          break;
        }
      }

      if (pubKeyFound === false) {
        const nextBlockHeight = parseInt(validator.lastHeight) + 1;
        const nbh = "0x" + nextBlockHeight.toString(16);
        const nextBlockVotes = await checkVotes(nbh);
        if (nextBlockVotes === null) {
          arrOfSignaturesOfMissingPreps.push({
            address: validator.address,
            name: validator.name,
            nodeAddress: validator.nodeAddress,
            lastHeight: validator.lastHeight,
            addressUsed: null,
            pubKey: null
          });
          pubKeyFound = true;
          continue;
        }
        for (const votes of nextBlockVotes) {
          if (
            votes[0] === validator.address ||
            votes[0] === validator.nodeAddress
          ) {
            arrOfSignaturesOfMissingPreps.push({
              address: validator.address,
              name: validator.name,
              nodeAddress: validator.nodeAddress,
              lastHeight: validator.lastHeight,
              addressUsed:
                votes[0] === validator.address
                  ? validator.address
                  : validator.nodeAddress,
              pubKey: votes[1]
            });
            pubKeyFound = true;
            break;
          }
        }
      }
      arrOfSignaturesOfMissingPreps.push({
        address: validator.address,
        name: validator.name,
        nodeAddress: validator.nodeAddress,
        lastHeight: validator.lastHeight,
        addressUsed: null,
        pubKey: null
      });
    }
    return arrOfSignaturesOfMissingPreps;
  } catch (e) {
    console.log("Could not register prep node public key.");
    console.log(e);
  }
}

async function getLastBlockValidated(prepsSorted) {
  try {
    const arrOfMissingPreps = prepsSorted;
    const arrOfSignaturesOfMissingPreps = [];

    // check each prep on chain data
    for (const validator of arrOfMissingPreps) {
      const prepData = await getPRep(validator.address);
      arrOfSignaturesOfMissingPreps.push({
        address: prepData.address,
        nodeAddress: prepData.nodeAddress,
        haveValidated: prepData.lastHeight === "0x0" ? false : true,
        name: prepData.name,
        lastHeight: prepData.lastHeight
        // ...prepData
      });
    }

    console.log("array of signatures of missing preps");
    console.log(arrOfSignaturesOfMissingPreps);
    const countOfHaveValidated = arrOfSignaturesOfMissingPreps.filter(p => {
      if (p.haveValidated === true) {
        return p;
      }
    });
    return countOfHaveValidated;
  } catch (e) {
    console.log("Could not register prep node public key: ");
    console.log(e);
  }
}

async function main() {
  // const prepsSorted = await getPRepsList();
  const prepsSorted = null;
  const RUN_REGISTRATION = true;
  const RUN_REGISTRATION_BY_TX_HASH = false;
  if (RUN_REGISTRATION) {
    if (RUN_REGISTRATION_BY_TX_HASH) {
      await runRegistrationByTxHash(prepsSorted);
    } else {
      // const arrOfValidatorsInConsensus = await getLastBlockValidated(
      //   prepsSorted
      // );
      const arrOfValidatorsInConsensus = [
        {
          address: "hxc453700b9bd823d7f7175808a0986c0e3a45f2b4",
          nodeAddress: "hx310565b927f131381b8dbbaa09d4098fa070f5cf",
          haveValidated: true,
          name: "InterBlock",
          lastHeight: "0x445bd9a"
        },
        {
          address: "hxc97bc2b6863b5f0094de7f0e5bcf82a404c4199b",
          nodeAddress: "hxc97bc2b6863b5f0094de7f0e5bcf82a404c4199b",
          haveValidated: true,
          name: "Silicon Valley ICON",
          lastHeight: "0x446660a"
        },
        {
          address: "hxd0d9b0fee857de26fd1e8b15209ca15b14b851b2",
          nodeAddress: "hx406c9d6fa4b8a51dba98797610fe5935f613fb07",
          haveValidated: true,
          name: "VELIC",
          lastHeight: "0x356e434"
        },
        {
          address: "hx15686bf1f501115a2b5de381a20edc1963cb2ec3",
          nodeAddress: "hx2adfadd700ecf177d76e6ef0c40f0143afa3ee8d",
          haveValidated: true,
          name: "ICONbet",
          lastHeight: "0x3539a04"
        },
        {
          address: "hxd6f20327d135cb0227230ab98792173a5c97b03e",
          nodeAddress: "hx49ce06eab947cb5ba2475781044d305af9d8d9d5",
          haveValidated: true,
          name: "ICONPLUS",
          lastHeight: "0x27cd9cf"
        },
        {
          address: "hx863e16bd18ceaa7d498b4b275e36cd58818b1f25",
          nodeAddress: "hxb38860401c2b845668682be057b42dff22c27c0f",
          haveValidated: true,
          name: "TNTXT",
          lastHeight: "0x1cb7543"
        },
        {
          address: "hx5da9e862b4e26e5ac486c1d70d9d63927ce35e1c",
          nodeAddress: "hxdd5da910a38a427770c484afd6dd03f92ee35add",
          haveValidated: true,
          name: "Studio Mirai",
          lastHeight: "0x34673da"
        },
        {
          address: "hx18a807c44b0efdc2e02ea503d7bc011cc4242318",
          nodeAddress: "hx0b3ae0c5087f2ad0150bcab87ca4f77ea5f541d9",
          haveValidated: true,
          name: "RHYTHM (Australia)",
          lastHeight: "0x2f8cda4"
        },
        {
          address: "hx9cdb5bd98a1d757ce195a99c6273833b80b51c28",
          nodeAddress: "hxa0a99a5e7036b7ed439fbbdb35f8d66f2177a2ae",
          haveValidated: true,
          name: "Catena",
          lastHeight: "0x1dde183"
        },
        {
          address: "hxfa6714e4ec784ae2176c416c46dc2c98b6ec9074",
          nodeAddress: "hxb20299f6fec4f43acdce9c6bb279e653a30703fd",
          haveValidated: true,
          name: "PiconbelloDAO",
          lastHeight: "0x3eaf13a"
        },
        {
          address: "hx42c103859f2cc380bacb5b0ad3b058d7fe57f430",
          nodeAddress: "hx4eed4ff1719c89b50c051ec4af821e8944dd92d7",
          haveValidated: true,
          name: "Oasis",
          lastHeight: "0x2f0e864"
        },
        {
          address: "hxaf6f61827901d7c4674cf5d2ddbbca2bdae72faf",
          nodeAddress: "hxf956842f78a0d7c06571100641ae7f127f16c0e5",
          haveValidated: true,
          name: "ICONoscope",
          lastHeight: "0x3301264"
        },
        {
          address: "hx3499cbe7a9c81b412243cac8c4e163d2e4ccb20c",
          nodeAddress: "hx9960c2b06fbe238ffcc239fe16b3ef052d5712ce",
          haveValidated: true,
          name: "Trustseers",
          lastHeight: "0x339f0f4"
        },
        {
          address: "hx3ec5c0c906e857de231a7ae16e49ab92c5708699",
          nodeAddress: "hx3b59358db9ea44e49ae72d0ace99ac5b4be8c30d",
          haveValidated: true,
          name: "ICX_Stratos",
          lastHeight: "0x3243a84"
        }
      ];
      console.log("arrOfValidatorsInConsensus");
      console.log(arrOfValidatorsInConsensus);
      const registrationResult = await runRegistrationByBlockHeader(
        arrOfValidatorsInConsensus
      );
      console.log("registrationResult");
      console.log(registrationResult);
    }
  }
}

main();
