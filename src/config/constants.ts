// Para SDK imports for web3 integration
import { Environment, ParaWeb } from "@getpara/react-sdk";

// Para API key from environment variables - required for Para SDK initialization
export const API_KEY = process.env.NEXT_PUBLIC_PARA_API_KEY ?? "";

// Validate API key is present
if (!API_KEY) {
  throw new Error("API key is not defined. Please set NEXT_PUBLIC_PARA_API_KEY in your environment variables.");
}

// Para environment configuration - defaults to BETA for development
export const ENVIRONMENT = (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment) || Environment.BETA;

// Solana Devnet RPC URL for blockchain interactions
export const DEVNET_RPC_URL = process.env.NEXT_PUBLIC_DEVNET_RPC_URL || "https://api.devnet.solana.com/";

// Initialize Para SDK instance with Beta environment and API key
// This instance is used throughout the app for wallet operations
export const para = new ParaWeb(Environment.BETA, API_KEY);