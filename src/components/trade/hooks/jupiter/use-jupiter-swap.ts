// import { isSolanaWallet } from '@dynamic-labs/solana'
import { useToastContent } from '@/components/starterkit/hooks/use-toast-content'
import { ConnectedSolanaWallet } from '@privy-io/react-auth'
import { Connection, VersionedTransaction } from '@solana/web3.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface UseJupiterSwapParams {
  inputMint: string
  outputMint: string
  inputAmount: string
  inputDecimals?: number
  outputDecimals?: number
  wallet: ConnectedSolanaWallet | null
  walletAddress: string
  swapMode?: string
}

interface QuoteResponse {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  platformFee?: {
    amount: string
    feeBps: number
  }
  priceImpactPct: string
  routePlan: {
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
    percent: number
  }[]
  contextSlot: number
  timeTaken: number
  swapUsdValue?: string
  simplerRouteUsed?: boolean
}

export const DEFAULT_SLIPPAGE_BPS = 'auto' // Default to auto slippage
export const DEFAULT_SLIPPAGE_VALUE = 50 // 0.5% as base value when needed

// Jupiter v6 API uses platformFeeBps in the quote API for fee collection
// The fee is taken from the output amount of the swap
export const REFERRAL_ACCOUNT = process.env.NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT || '3i9DA5ddTXwDLdaKRpK9BA4oXumVpPWWGuyD3YKxPs1j'
export const REFERRAL_FEE_BPS = 251 // 2.51% referral fee

// Legacy platform fee constants (kept for reference)
// export const PLATFORM_FEE_BPS = 80
// export const PLATFORM_FEE_ACCOUNT = '8jTiTDW9ZbMHvAD9SZWvhPfRx5gUgK7HACMdgbFp2tUz'

export function useJupiterSwap({
  inputMint,
  outputMint,
  inputAmount,
  inputDecimals,
  outputDecimals,
  wallet,
  walletAddress,
  swapMode = 'ExactIn',
}: UseJupiterSwapParams) {
  const { ERRORS, LOADINGS, SUCCESS } = useToastContent()
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null)
  const [expectedOutput, setExpectedOutput] = useState<string>('')
  const [txSignature, setTxSignature] = useState<string>('')
  const [isFullyConfirmed, setIsFullyConfirmed] = useState<boolean>(false)
  const [isQuoteRefreshing, setIsQuoteRefreshing] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [priceImpact, setPriceImpact] = useState<string>('')
  const [sseFeeAmount, setSseFeeAmount] = useState<string>('0')
  const [error, setError] = useState<string | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const resetQuoteState = useCallback(() => {
    setQuoteResponse(null)
    setExpectedOutput('')
    setPriceImpact('')
    setTxSignature('')
    setError(null)
    setTxSignature('')
    setIsFullyConfirmed(false)
    setIsQuoteRefreshing(false)
    setSseFeeAmount('0')
  }, [])

  const fetchQuote = useCallback(async () => {
    if (
      Number(inputAmount) === 0 ||
      !inputAmount ||
      !inputMint ||
      !outputMint ||
      !outputDecimals ||
      !inputDecimals
    ) {
      resetQuoteState()
      return
    }

    try {
      if (quoteResponse) {
        setIsQuoteRefreshing(true)
      } else {
        setLoading(true)
      }

      const inputAmountInDecimals = Math.floor(
        Number(inputAmount) * Math.pow(10, inputDecimals),
      )
      const QUOTE_URL = `
        https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${inputAmountInDecimals}&slippageBps=${DEFAULT_SLIPPAGE_VALUE}&platformFeeBps=${REFERRAL_FEE_BPS}&feeAccount=${REFERRAL_ACCOUNT}&swapMode=${swapMode}
      `
      const response = await fetch(QUOTE_URL).then((res) => res.json())
      if (swapMode == 'ExactIn') {
        setExpectedOutput(
          (
            Number(response.outAmount) / Math.pow(10, outputDecimals)
          ).toString(),
        )
      } else {
        setExpectedOutput(
          (Number(response.inAmount) / Math.pow(10, outputDecimals)).toString(),
        )
      }
      setPriceImpact(response.priceImpactPct)
      setQuoteResponse(response)
      setError('')
    } catch (err) {
      console.error(err)
      setError('Failed to output amount')
      setSseFeeAmount('0')
    } finally {
      setLoading(false)
      setIsQuoteRefreshing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputAmount,
    inputMint,
    inputDecimals,
    outputMint,
    outputDecimals,
    resetQuoteState,
  ])

  const refreshQuote = useCallback(() => {
    if (!isQuoteRefreshing && !loading) {
      fetchQuote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteRefreshing, loading])

  const handleSwap = async () => {
    if (!wallet) {
      toast.error(
        ERRORS.WALLET_CONNETION_ERR.title,
        ERRORS.WALLET_CONNETION_ERR.content,
      )
      return
    }

    setLoading(true)
    setIsFullyConfirmed(false)

    if (!quoteResponse) {
      console.error('QuoteResponse Error')
      toast.error(
        ERRORS.JUP_QUOTE_API_ERR.title,
        ERRORS.JUP_QUOTE_API_ERR.content,
      )
      setLoading(false)
      return
    }

    const preparingToastId = toast.loading(
      LOADINGS.PREPARING_LOADING.title,
      LOADINGS.PREPARING_LOADING.content,
    )

    try {
      const response = await fetch('/api/jupiter/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          walletAddress,
          mintAddress: outputMint,
          slippageMode: 'auto',
          slippageBps: calculateAutoSlippage(priceImpact),
          swapMode,
        }),
      }).then((res) => res.json())

      if (response.error) {
        toast.dismiss(preparingToastId)
        toast.error(
          ERRORS.JUP_SWAP_API_ERR.title,
          ERRORS.JUP_SWAP_API_ERR.content,
        )
        console.error('Jupiter swap error:', response.error)
        return
      }

      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL || '')
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(response.transaction, 'base64'),
      )

      toast.dismiss(preparingToastId)

      try {
        const signedTransaction = await wallet.signTransaction(transaction)

        const sendingToastId = toast.loading(
          LOADINGS.SEND_LOADING.title,
          LOADINGS.SEND_LOADING.content,
        )

        const txSig = await connection.sendRawTransaction(
          signedTransaction.serialize(),
        )
        setTxSignature(txSig)

        toast.dismiss(sendingToastId)
        const confirmToastId = toast.loading(
          LOADINGS.CONFIRM_LOADING.title,
          LOADINGS.CONFIRM_LOADING.content,
        )

        const tx = await connection.confirmTransaction(
          {
            signature: txSig,
            ...(await connection.getLatestBlockhash()),
          },
          'confirmed',
        )

        if (tx.value.err) {
          toast.dismiss(confirmToastId)
          toast.error(ERRORS.TX_FAILED_ERR.title, ERRORS.TX_FAILED_ERR.content)
          console.error('Error in confirming tx:', tx.value.err)
        } else {
          toast.dismiss(confirmToastId)
          toast.success(SUCCESS.TX_SUCCESS.title, SUCCESS.TX_SUCCESS.content)
          setIsFullyConfirmed(true)
        }
      } catch (signError: any) {
        toast.dismiss()
        
        // Enhanced error handling for insufficient SOL balance
        if (signError.message?.includes('insufficient lamports') ||
            signError.message?.includes('0x1') ||
            signError.toString().includes('insufficient lamports')) {
          
          // Extract the amounts from the error if possible
          const match = signError.message?.match(/insufficient lamports (\d+), need (\d+)/)
          if (match) {
            const currentLamports = parseInt(match[1])
            const neededLamports = parseInt(match[2])
            const currentSOL = (currentLamports / 1e9).toFixed(4)
            const neededSOL = (neededLamports / 1e9).toFixed(4)
            const additionalSOL = ((neededLamports - currentLamports) / 1e9).toFixed(4)
            
            toast.error('Insufficient SOL Balance', {
              description: `You need ${additionalSOL} more SOL to complete this transaction. Current: ${currentSOL} SOL, Required: ${neededSOL} SOL for transaction fees and account rent.`,
              duration: 8000,
            })
          } else {
            toast.error('Insufficient SOL Balance', {
              description: 'You need more SOL in your wallet to pay for transaction fees and account creation. Please add at least 0.01 SOL to continue.',
              duration: 8000,
            })
          }
        } else {
          toast.error('Failed to sign/send transaction', {
            description: signError.message || 'Unknown error occurred',
          })
        }
        return
      }
    } catch (error) {
      toast.dismiss()
      toast.error(ERRORS.TX_FAILED_ERR.title, ERRORS.TX_FAILED_ERR.content)
      console.error('Error in swap', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (
      Number(inputAmount) !== 0 &&
      inputAmount &&
      inputMint &&
      outputMint &&
      !isFullyConfirmed
    ) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isQuoteRefreshing && !loading) fetchQuote() // Use a flag to prevent multiple concurrent refreshes
      }, 15000)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    inputAmount,
    inputMint,
    outputMint,
    loading,
    isFullyConfirmed,
    isQuoteRefreshing,
  ])

  useEffect(() => {
    // Only fetch quote if we have the necessary inputs and not already refreshing
    if (
      Number(inputAmount) !== 0 &&
      inputAmount &&
      inputMint &&
      outputMint &&
      !isQuoteRefreshing &&
      !loading
    ) {
      fetchQuote()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputAmount, inputMint, outputMint])

  return {
    loading,
    error,
    txSignature,
    quoteResponse,
    expectedOutput,
    priceImpact,
    isFullyConfirmed,
    isQuoteRefreshing,
    sseFeeAmount,
    handleSwap,
    refreshQuote,
  }
}

function calculateAutoSlippage(priceImpactPct: string): number {
  const impact = Math.abs(parseFloat(priceImpactPct))

  // Default to 0.5% (50 bps) if no price impact or invalid
  if (!impact || isNaN(impact)) return 50

  // Scale slippage based on price impact
  if (impact <= 0.1) return 50 // 0.5% slippage for very low impact
  if (impact <= 0.5) return 100 // 1% slippage for low impact
  if (impact <= 1.0) return 200 // 2% slippage for medium impact
  if (impact <= 2.0) return 500 // 5% slippage for high impact
  if (impact <= 5.0) return 1000 // 10% slippage for very high impact
  return 1500 // 15% slippage for extreme impact
}
