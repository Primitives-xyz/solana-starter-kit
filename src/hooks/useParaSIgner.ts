"use client";

// React hooks for state management
import { useEffect, useState } from "react";
// Para Solana integration for transaction signing
import { ParaSolanaWeb3Signer } from "@getpara/solana-web3.js-v1-integration";
// Solana connection hook
import { useSolana } from "./useSolana";
// Para wallet provider context
import { usePara } from "@/components/provider/ParaProvider";
// Para SDK instance
import { para } from "@/config/constants";

/**
 * Custom hook for Para Solana transaction signer
 * Integrates Para wallet with Solana web3.js for transaction signing
 * @returns Para signer instance and Solana connection
 */
export function useParaSigner() {
  // Get Para wallet state from context
  const { signer: contextSigner, connection, isConnected } = usePara();
  // Get alternative Solana connection
  const { connection: solanaConnection } = useSolana();
  // Local signer state
  const [signer, setSigner] = useState<ParaSolanaWeb3Signer | null>(null);

  // Initialize Para signer when wallet is connected
  useEffect(() => {
    if (isConnected && connection && solanaConnection) {
      try {
        // Prefer signer from ParaProvider context, fallback to new instance
        const newSigner = contextSigner || new ParaSolanaWeb3Signer(para, solanaConnection);
        setSigner(newSigner);
      } catch (error) {
        console.error("Failed to initialize Para signer:", error);
        setSigner(null);
      }
    } else {
      // Clear signer when wallet is disconnected
      setSigner(null);
    }
  }, [isConnected, connection, solanaConnection, contextSigner]);

  return {
    signer, // Para-powered Solana transaction signer
    connection: solanaConnection || connection, // Prioritize useSolana connection for consistency
  };
}