import { Connection } from "@solana/web3.js";


const DEVNET_RPC_URL = "https://api.devnet.solana.com";
// Create a single shared connection instance
const connection = new Connection(DEVNET_RPC_URL, "confirmed");

export function useSolana() {
  return {
    connection,
  };
}