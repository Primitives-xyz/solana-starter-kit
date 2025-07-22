/* eslint-disable react-hooks/exhaustive-deps */
"use client";

// React and provider setup
import { createContext, useContext, useState, useCallback, useEffect } from "react";
// Para SDK components and authentication
import { ParaModal, AuthLayout, OAuthMethod } from "@getpara/react-sdk";
// Para Solana integration for transaction signing
import { ParaSolanaWeb3Signer } from "@getpara/solana-web3.js-v1-integration";
// React Query for caching and state management
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// Solana web3.js connection
import { Connection } from "@solana/web3.js";
// Para instance configuration
import { para } from "@/config/constants";

// Solana Devnet RPC endpoint - matches the RPC used in other parts of the app
const DEVNET_RPC_URL = "https://api.devnet.solana.com";

// React Query client for Para SDK data management
const queryClient = new QueryClient();

// Para context interface defining all available wallet state and methods
interface ParaContextType {
  isConnected: boolean; // Para wallet connection status
  address: string | null; // Connected Solana wallet address
  walletId: string | null; // Para internal wallet ID
  isLoading: boolean; // Loading state for async operations
  error: string | null; // Error state for failed operations
  openModal: () => void; // Function to open Para authentication modal
  closeModal: () => void; // Function to close modal and refresh state
  signer: ParaSolanaWeb3Signer | null; // Solana transaction signer instance
  connection: Connection | null; // Solana web3.js connection instance
}

const ParaContext = createContext<ParaContextType | undefined>(undefined);


export function ParaProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signer, setSigner] = useState<ParaSolanaWeb3Signer | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);

  // Initialize Solana web3.js connection and Para signer for transactions
  const initializeSolanaWeb3 = () => {
    const connection = new Connection(DEVNET_RPC_URL, "confirmed");
    const signer = new ParaSolanaWeb3Signer(para, connection); // Para-powered Solana signer
    setConnection(connection);
    setSigner(signer);
  };

  // Clean up Solana connection and signer on logout/disconnect
  const clearSolanaWeb3 = () => {
    setConnection(null);
    setSigner(null);
  };

  // Check Para authentication status and setup wallet connection
  const checkAuthentication = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Check if user is fully authenticated with Para
      const isAuthenticated = await para.isFullyLoggedIn();
      setIsConnected(isAuthenticated);
      
      if (isAuthenticated) {
        // Get Solana wallets associated with Para account
        const wallets = await para.getWalletsByType("SOLANA");
        if (wallets.length) {
          // Set the first Solana wallet as the active one
          setAddress(wallets[0].address || null);
          setWalletId(wallets[0].id || null);
          // Initialize Solana transaction capabilities
          initializeSolanaWeb3();
        } else {
          clearSolanaWeb3();
        }
      } else {
        // Clear all wallet state if not authenticated
        clearSolanaWeb3();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication");
      clearSolanaWeb3();
    }
    setIsLoading(false);
  };

  useEffect(() => {
    checkAuthentication();
    return () => {
      clearSolanaWeb3();
    };
  }, []);

  // Open Para authentication modal
  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close modal and refresh authentication state
  const closeModal = useCallback(async () => {
    await checkAuthentication(); // Refresh auth state after modal closes
    setIsOpen(false);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ParaContext.Provider
        value={{
          isConnected,
          address,
          walletId,
          isLoading,
          error,
          openModal,
          closeModal,
          signer,
          connection,
        }}
      >
        {children}
        {/* Para Authentication Modal with full OAuth options */}
        <ParaModal
          para={para} // Para SDK instance
          isOpen={isOpen}
          onClose={closeModal}
          disableEmailLogin={false} // Allow email/password login
          disablePhoneLogin={false} // Allow phone number login
          authLayout={[AuthLayout.AUTH_FULL]} // Full authentication layout
          oAuthMethods={[ // Supported OAuth providers
            OAuthMethod.APPLE,
            OAuthMethod.DISCORD,
            OAuthMethod.FACEBOOK,
            OAuthMethod.FARCASTER,
            OAuthMethod.GOOGLE,
            OAuthMethod.TWITTER,
          ]}
          onRampTestMode={true} // Enable test mode for fiat on-ramp
          theme={{ // Custom dark theme matching app design
            mode: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            font: 'inherit',
            backgroundColor: '#000000', // Pure black background
            foregroundColor: '#ffffff', // White text
            accentColor: '#5252f2', // Primary accent color
            darkBackgroundColor: '#000000', // Dark mode background
            darkForegroundColor: '#ffffff', // Dark mode text
            darkAccentColor: '#9333ea', // Dark mode accent
          }}
          logo="/para.svg" // Custom Para logo
          recoverySecretStepEnabled={true} // Enable wallet recovery
          twoFactorAuthEnabled={false} // Disable 2FA for simplicity
        />
      </ParaContext.Provider>
    </QueryClientProvider>
  );
}

export function usePara() {
  const context = useContext(ParaContext);
  if (context === undefined) {
    throw new Error("usePara must be used within a ParaProvider");
  }
  return context;
}