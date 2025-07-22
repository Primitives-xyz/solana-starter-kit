"use client";

import { useGetProfiles } from "@/components/auth/hooks/use-get-profiles";
import { usePrivy } from "@privy-io/react-auth";
import { usePara } from "@/components/provider/ParaProvider";
import { useEffect, useState } from "react";

export function useCurrentWallet() {
  const [walletAddress, setWalletAddress] = useState<string>("");
  const { user, authenticated, ready } = usePrivy();
  const { isConnected: isParaConnected, address: paraAddress } = usePara();

  const { profiles, loading } = useGetProfiles({
    walletAddress: walletAddress || "",
  });

  useEffect(() => {
    if (isParaConnected && paraAddress) {
      setWalletAddress(paraAddress); // Use Para address if connected
    } else if (authenticated && ready && user?.wallet?.address) {
      setWalletAddress(user.wallet.address); // Fallback to Privy
    } else {
      setWalletAddress("");
    }
  }, [isParaConnected, paraAddress, user, authenticated, ready]);

  return {
    walletIsConnected: walletAddress !== "",
    walletAddress,
    mainUsername: profiles?.[0]?.profile?.username,
    loadingMainUsername: loading,
    setWalletAddress,
  };
}