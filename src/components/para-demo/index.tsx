/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { usePara } from "@/components/provider/ParaProvider";
import { para } from "@/config/constants";
import { createTestTransaction } from "@getpara/solana-web3.js-v1-integration";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { useState, useEffect } from "react";

export function ParaTransactionDemo() {
  const [toAddress, setToAddress] = useState("8Ch71Zqr1UoSj9pCfsRnaobxGvF8G6pgJ9DumsQGJ7dA");
  const [amount, setAmount] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string>("");
  const [testTxSignature, setTestTxSignature] = useState<string>(""); // Renamed from `signature`
  const [status, setStatus] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    message: string;
  }>({ show: false, type: "success", message: "" });

  const { isConnected, address, signer, connection } = usePara();

  console.log("isConnected, address:", { isConnected, address });

  // Debug Para context
  useEffect(() => {
    console.log("Para Context:", { isConnected, address, signer, connection });
  }, [isConnected, address, signer, connection]);

  // Fetch balance when address changes
  const fetchBalance = async () => {
    if (!address || !connection || !signer || !signer.sender) {
      console.log("Balance fetch skipped:", { address, connection, signer });
      return;
    }

    setIsSending(true);
    try {
      const balanceLamports = await connection.getBalance(signer.sender);
      setBalance((balanceLamports / LAMPORTS_PER_SOL).toFixed(4));
      console.log("Balance fetched:", balanceLamports / LAMPORTS_PER_SOL);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setStatus({
        show: true,
        type: "error",
        message: "Failed to fetch balance. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (address) fetchBalance();
  }, [address]);

  // Sign a test transaction
  const handleSignTestTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigning(true);
    setStatus({ show: false, type: "success", message: "" });
    setTestTxSignature("");

    if (!signer || !connection || !signer.sender) {
      setStatus({
        show: true,
        type: "error",
        message: "Signer or connection not available. Please connect your wallet.",
      });
      setIsSigning(false);
      return;
    }

    try {
      if (!isConnected) {
        setStatus({
          show: true,
          type: "error",
          message: "Please connect your Para wallet to sign a transaction.",
        });
        return;
      }

      // Create a test transaction
      const transaction = await createTestTransaction(para);
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      transaction.feePayer = signer.sender;

      // Sign the transaction
      const signedTx = await signer.signTransaction(transaction);

      // Extract the signature
      const signature = signedTx.signatures.find((sig: any) => sig.publicKey.equals(signer.sender))?.signature;
      if (!signature) {
        throw new Error("Failed to extract transaction signature.");
      }

      // Convert signature to base64
      const base64Signature = Buffer.from(signature).toString("base64");
      setTestTxSignature(base64Signature);
      setStatus({
        show: true,
        type: "success",
        message: "Test transaction signed successfully!",
      });
    } catch (error) {
      console.error("Error signing test transaction:", error);
      setStatus({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to sign test transaction. Please try again.",
      });
    } finally {
      setIsSigning(false);
    }
  };

  // Send SOL transaction
  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setStatus({ show: false, type: "success", message: "" });
    setTxSignature("");

    if (!signer || !connection || !signer.sender) {
      setStatus({
        show: true,
        type: "error",
        message: "Signer or connection not available. Please connect your wallet.",
      });
      setIsSending(false);
      return;
    }

    try {
      if (!isConnected) {
        setStatus({
          show: true,
          type: "error",
          message: "Please connect your Para wallet to send a transaction.",
        });
        return;
      }

      // Validate recipient address
      let recipientPubkey;
      try {
        recipientPubkey = new PublicKey(toAddress);
      } catch (error) {
        setStatus({
          show: true,
          type: "error",
          message: "Invalid recipient address format.",
        });
        return;
      }

      const amountFloat = parseFloat(amount);
      if (isNaN(amountFloat)) {
        setStatus({
          show: true,
          type: "error",
          message: "Please enter a valid amount.",
        });
        return;
      }

      if (amountFloat <= 0) {
        setStatus({
          show: true,
          type: "error",
          message: "Amount must be greater than 0.",
        });
        return;
      }

      const amountLamports = BigInt(Math.round(amountFloat * LAMPORTS_PER_SOL));
      const balanceLamports = await connection.getBalance(signer.sender);

      if (amountLamports > BigInt(balanceLamports)) {
        const requiredSol = (Number(amountLamports) / LAMPORTS_PER_SOL).toFixed(4);
        const availableSol = (balanceLamports / LAMPORTS_PER_SOL).toFixed(4);
        setStatus({
          show: true,
          type: "error",
          message: `Insufficient balance. Requires ${requiredSol} SOL, but only ${availableSol} SOL available.`,
        });
        return;
      }

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

      const tx = new Transaction({
        feePayer: signer.sender,
        recentBlockhash: blockhash,
      });

      tx.add(
        SystemProgram.transfer({
          fromPubkey: signer.sender,
          toPubkey: recipientPubkey,
          lamports: amountLamports,
        })
      );

      console.log("Transaction created:", tx);

      // Sign and send the transaction
      const signedTx = await signer.signTransaction(tx);
      const txSignature = await connection.sendRawTransaction(signedTx.serialize());
      setTxSignature(txSignature);

      setStatus({
        show: true,
        type: "info",
        message: "Transaction submitted. Waiting for confirmation...",
      });

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature: txSignature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      setStatus({
        show: true,
        type: "success",
        message: "Transaction confirmed!",
      });

      // Refresh balance
      await fetchBalance();
      setAmount("");
    } catch (error) {
      console.error("Error sending transaction:", error);
      setStatus({
        show: true,
        type: "error",
        message: error instanceof Error ? error.message : "Failed to send transaction. Please try again.",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold tracking-tight mb-6 text-center text-primary">Para Transaction Demo</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-center">
        Sign a test transaction or send SOL using your Para wallet. This demo showcases transaction signing and SOL transfers on Devnet.
      </p>

      {/* Balance Section */}
      <div className="max-w-xl mx-auto mb-8 card-primary p-6 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-medium text-muted-foreground">Current Balance:</h3>
          <button
            onClick={fetchBalance}
            disabled={isSending || isSigning || !address}
            className="p-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <span className={isSending || isSigning ? "animate-spin" : ""}>🔄</span>
          </button>
        </div>
        <p className="text-lg font-medium text-foreground">
          {!address
            ? "Connect wallet to see balance"
            : isSending || isSigning
            ? "Loading..."
            : balance
            ? `${parseFloat(balance).toFixed(4)} SOL`
            : "Unable to fetch balance"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">Network: Devnet</p>
      </div>

      {/* Status Message */}
      {status.show && (
        <div
          className={`max-w-xl mx-auto mb-6 p-4 rounded-lg border ${
            status.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
              : status.type === "error"
              ? "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
              : "bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300"
          }`}
        >
          <p className="text-sm">{status.message}</p>
        </div>
      )}

      {/* Test Transaction Signing */}
      <div className="max-w-xl mx-auto mb-8 card-primary p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-primary">Sign a Test Transaction</h2>
        <form onSubmit={handleSignTestTransaction} className="space-y-4">
          <button
            type="submit"
            disabled={isSigning || isSending}
            className="w-full button-primary px-4 py-2 rounded-md"
          >
            {isSigning ? "Signing..." : "Sign Test Transaction"}
          </button>
        </form>
        {testTxSignature && (
          <div className="mt-4 p-4 bg-muted/50 border border-border rounded-md">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Test Transaction Signature:</h3>
            <p className="text-sm break-all bg-background p-2 rounded-md text-foreground">{testTxSignature}</p>
          </div>
        )}
      </div>

      {/* SOL Transfer Form */}
      <div className="max-w-xl mx-auto card-primary p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-primary">Send SOL</h2>
        <form onSubmit={handleSendTransaction} className="space-y-4">
          <div>
            <label htmlFor="toAddress" className="block text-sm font-medium mb-2 text-muted-foreground">
              Recipient Address
            </label>
            <input
              id="toAddress"
              type="text"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Enter recipient address"
              required
              disabled={isSending || isSigning}
              className="w-full px-4 py-2 input-primary rounded-md"
            />
          </div>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium mb-2 text-muted-foreground">
              Amount (SOL)
            </label>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.01"
              min="0"
              required
              disabled={isSending || isSigning}
              className="w-full px-4 py-2 input-primary rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={!toAddress || !amount || isSending || isSigning}
            className="w-full button-primary px-4 py-2 rounded-md"
          >
            {isSending ? "Sending..." : "Send Transaction"}
          </button>
        </form>
        {txSignature && (
          <div className="mt-4 p-4 bg-muted/50 border border-border rounded-md">
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Transaction Signature:</h3>
            <a
              href={`https://solscan.io/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 hover:underline"
            >
              <p className="text-sm break-all bg-background p-2 rounded-md text-foreground">{txSignature}</p>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}