require("dotenv").config();

module.exports = {
  contract: {
    chain: "cx0000000000000000000000000000000000000000"
  },
  config: {
    pk: {
      a: process.env.PRIVATE_KEY,
      b: process.env.PRIVATE_KEY_2
    },
    rpcUrl: process.env.RPC_URL,
    nid: process.env.RPC_NID
  }
};
