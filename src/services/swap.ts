import { JUPITER_CONFIG } from '@/config/jupiter'
import {
  buildTransactionMessage,
  fetchSwapInstructions,
  getAddressLookupTableAccounts,
  simulateTransaction,
} from '@/services/jupiter'
import type { SwapRouteResponse } from '@/types/jupiter-service'
import { getCreateATAInstructions } from '@/utils/token'
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from '@solana/web3.js'
import bs58 from 'bs58'

export interface SwapRequest {
  quoteResponse: any
  walletAddress: string
  sseTokenAccount?: string
  sseFeeAmount?: string
  priorityFee?: number
  mintAddress: string
  isCopyTrade?: boolean
  slippageMode: 'auto' | 'fixed'
  slippageBps: number
}

export class SwapService {
  private connection: Connection

  constructor(connection: Connection) {
    this.connection = connection
  }

  private async getPayerKeypair(): Promise<Keypair> {
    const PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY
    if (!PRIVATE_KEY) {
      throw new Error('PAYER_PRIVATE_KEY is not set')
    }
    const secretKey = bs58.decode(PRIVATE_KEY)
    return Keypair.fromSecretKey(secretKey)
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // create connection
  public static async createConnection(): Promise<Connection> {
    return new Connection(
      process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    )
  }

  public async buildSwapTransaction(
    request: SwapRequest,
    outputAta: PublicKey,
    additionalInstructions: any[] = [],
  ): Promise<{
    transaction: VersionedTransaction
    swapResponse: any
    addressLookupTableAccounts: any[]
  }> {
    try {
      const effectiveSlippageBps =
        request.slippageMode === 'auto'
          ? request.quoteResponse.slippageBps
          : request.slippageBps

      let swapResponse
      try {
        swapResponse = await fetchSwapInstructions({
          quoteResponse: request.quoteResponse,
          userPublicKey: request.walletAddress,
          prioritizationFeeLamports: request.priorityFee,
          feeAccount: outputAta.toString(),
          slippageBps: effectiveSlippageBps,
        })
      } catch (error: any) {
        console.error('Error in fetch Swap Instruction', error)
        throw error
      }

      // If we received a serialized transaction from the direct swap API
      if (swapResponse.swapInstruction && typeof swapResponse.swapInstruction === 'string') {
        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(swapResponse.swapInstruction, 'base64')
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf)
        
        // If we have additional instructions (like ATA creation), we need to handle them separately
        // For now, we'll return the transaction as-is since the swap API already includes necessary instructions
        if (additionalInstructions.length > 0) {
          console.warn('Additional instructions cannot be added to pre-built swap transaction')
        }
        
        return {
          transaction,
          swapResponse,
          addressLookupTableAccounts: [],
        }
      }

      // Fallback to original instruction-based approach if not using direct swap API
      let addressLookupTableAccounts
      try {
        addressLookupTableAccounts = await getAddressLookupTableAccounts(
          this.connection,
          swapResponse.addressLookupTableAddresses || [],
        )
      } catch (error: any) {
        console.log('Error in get address lookup table accounts', error)
        throw error
      }

      const { blockhash } = await this.connection.getLatestBlockhash()

      const message = buildTransactionMessage(
        new PublicKey(request.walletAddress),
        blockhash,
        swapResponse,
        undefined,
        addressLookupTableAccounts,
        additionalInstructions,
      )

      return {
        transaction: new VersionedTransaction(message),
        swapResponse,
        addressLookupTableAccounts,
      }
    } catch (error: any) {
      console.error('Error in build swap transaction:', error)
      throw error
    }
  }

  public async createSwapTransaction(
    request: SwapRequest,
  ): Promise<SwapRouteResponse> {
    try {
      // Check output token ATA and get creation instructions if needed
      const { ata: outputAta, instructions: ataInstructions } =
        await getCreateATAInstructions(
          this.connection,
          new PublicKey(request.walletAddress),
          new PublicKey(request.mintAddress),
          new PublicKey(JUPITER_CONFIG.FEE_WALLET),
        )

      // Build and simulate transaction with ATA creation instructions if needed
      const { transaction, swapResponse, addressLookupTableAccounts } =
        await this.buildSwapTransaction(request, outputAta, ataInstructions)

      try {
        await simulateTransaction(
          this.connection,
          transaction,
          addressLookupTableAccounts,
        )
      } catch (error: any) {
        console.error('Error in simulate transaction:', error)
      }

      const response = {
        transaction: Buffer.from(transaction.serialize()).toString('base64'),
        lastValidBlockHeight: swapResponse.lastValidBlockHeight,
        computeUnitLimit: swapResponse.computeUnitLimit,
        prioritizationFeeLamports: swapResponse.prioritizationFeeLamports,
      }

      return response
    } catch (error: any) {
      console.error('Error in create swap transaction:', error)
      throw error
    }
  }
}
