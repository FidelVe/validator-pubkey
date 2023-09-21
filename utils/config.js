const ENV_TYPE = process.env.NODE_ENV;
const allowedEnvTypes = ["mainnet", "lisbon"];
if (!allowedEnvTypes.includes(ENV_TYPE)) {
  throw new Error(
    `Invalid NODE_ENV: ${ENV_TYPE}. Must be one of ${allowedEnvTypes}`
  );
}

const ENV_PATH = process.env.NODE_ENV === "mainnet" ? "./.env.prod" : "./.env";

require("dotenv").config({ path: ENV_PATH });

module.exports = {
  contract: {
    chain: "cx0000000000000000000000000000000000000000"
  },
  tracker: {
    routes: {
      addressTransactions: "/api/v1/transactions/address/",
      contractLogs: "/api/v1/logs?address="
    },
    mainnet: "tracker.icon.community",
    lisbon: "tracker.lisbon.icon.community"
  },
  config: {
    pk: {
      a: process.env.PRIVATE_KEY,
      b: process.env.PRIVATE_KEY_2
    },
    rpcUrl: process.env.RPC_URL,
    nid: process.env.RPC_NID
  },
  env: ENV_TYPE
};
