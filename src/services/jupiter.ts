import type {
  SwapInstructionsRequest,
  SwapInstructionsResponse,
} from '@/types/jupiter-service'
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token'
import {
  AddressLookupTableAccount,
  Connection,
  MessageV0,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js'

// Helper function to deserialize instructions from Jupiter
export const deserializeInstruction = (
  instruction: any,
): TransactionInstruction => {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, 'base64'),
  })
}

// Helper function to get address lookup table accounts
export const getAddressLookupTableAccounts = async (
  connection: Connection,
  keys: string[],
): Promise<AddressLookupTableAccount[]> => {
  if (!keys.length) return []

  try {
    const addressLookupTableAccountInfos =
      await connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key)),
      )

    if (!addressLookupTableAccountInfos.length) {
      throw new Error('Failed to fetch lookup table accounts')
    }

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index]
      if (accountInfo && addressLookupTableAddress) {
        try {
          const addressLookupTableAccount = new AddressLookupTableAccount({
            key: new PublicKey(addressLookupTableAddress),
            state: AddressLookupTableAccount.deserialize(accountInfo.data),
          })
          acc.push(addressLookupTableAccount)
        } catch (error: any) {
          console.error(
            `Failed to deserialize lookup table account ${addressLookupTableAddress}:`,
            error,
          )
        }
      }
      return acc
    }, new Array<AddressLookupTableAccount>())
  } catch (error: any) {
    console.error('Failed to fetch lookup table accounts:', error)
    throw new Error('Failed to fetch lookup table accounts: ' + error.message)
  }
}

// Helper function to simulate transaction
export const simulateTransaction = async (
  connection: Connection,
  transaction: VersionedTransaction,
  addressLookupTableAccounts: AddressLookupTableAccount[],
): Promise<void> => {
  try {
    const response = await connection.simulateTransaction(transaction, {
      replaceRecentBlockhash: true,
      sigVerify: false,
      accounts: {
        encoding: 'base64',
        addresses: addressLookupTableAccounts.map((account) =>
          account.key.toBase58(),
        ),
      },
    })

    if (response.value.err) {
      console.error('Simulation error:', response.value.logs)
      throw new Error(
        `Transaction simulation failed: ${JSON.stringify(response.value.err)}`,
      )
    }
  } catch (error: any) {
    console.error('Failed to simulate transaction:', error)
    throw new Error('Transaction simulation failed: ' + error.message)
  }
}

// Function to fetch swap instructions from Jupiter API
export const fetchSwapInstructions = async (
  request: SwapInstructionsRequest,
): Promise<SwapInstructionsResponse> => {
  // Using the direct swap API endpoint 
  // Note: We no longer add referral parameters here as they're handled in the quote API via platformFeeBps
  const response = await fetch(
    'https://quote-api.jup.ag/v6/swap',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: request.quoteResponse,
        userPublicKey: request.userPublicKey,
        prioritizationFeeLamports: request.prioritizationFeeLamports || 10000,
        dynamicComputeUnitLimit: true,
        dynamicSlippage: request.slippageBps === 'auto' ? true : false,
        slippageBps: request.slippageBps === 'auto' ? undefined : request.slippageBps,
        wrapAndUnwrapSol: true,
        useSharedAccounts: false,
        feeAccount: request.feeAccount,
      }),
    },
  ).then((res) => res.json())

  if (response.error) {
    throw new Error('Failed to get swap transaction: ' + response.error)
  }

  // The direct swap API returns a serialized transaction
  // We need to extract the necessary data to match our expected interface
  return {
    swapInstruction: response.swapTransaction, // The serialized transaction
    addressLookupTableAddresses: response.addressLookupTableAddresses || [],
    lastValidBlockHeight: response.lastValidBlockHeight,
    computeUnitLimit: response.computeUnitLimit,
    prioritizationFeeLamports: response.prioritizationFeeLamports,
  }
}

// Function to create SSE transfer instruction
export const createSSETransferInstruction = async (
  connection: Connection,
  sourceTokenAccount: PublicKey,
  destinationTokenAccount: PublicKey,
  owner: PublicKey,
  amount: string,
): Promise<TransactionInstruction> => {
  // Check if both accounts exist
  const [sourceInfo, destInfo] = await Promise.all([
    connection.getAccountInfo(sourceTokenAccount),
    connection.getAccountInfo(destinationTokenAccount),
  ])

  if (!sourceInfo || !destInfo) {
    throw new Error(
      'SSE token accounts not found. Please ensure both source and destination accounts exist.',
    )
  }

  return createTransferInstruction(
    sourceTokenAccount,
    destinationTokenAccount,
    owner,
    BigInt(amount),
    [],
    TOKEN_PROGRAM_ID,
  )
}

// Function to build and compile transaction message
export const buildTransactionMessage = (
  payerKey: PublicKey,
  recentBlockhash: string,
  swapResponse: SwapInstructionsResponse,
  sseTransferInstruction?: TransactionInstruction,
  addressLookupTableAccounts: AddressLookupTableAccount[] = [],
  additionalInstructions: TransactionInstruction[] = [],
): MessageV0 => {
  return new TransactionMessage({
    payerKey,
    recentBlockhash,
    instructions: [
      ...(swapResponse.computeBudgetInstructions || []).map(
        deserializeInstruction,
      ),
      ...additionalInstructions,
      ...(swapResponse.setupInstructions || []).map(deserializeInstruction),
      ...(swapResponse.tokenLedgerInstruction
        ? [deserializeInstruction(swapResponse.tokenLedgerInstruction)]
        : []),
      deserializeInstruction(swapResponse.swapInstruction),
      ...(swapResponse.cleanupInstruction
        ? [deserializeInstruction(swapResponse.cleanupInstruction)]
        : []),
      ...(sseTransferInstruction ? [sseTransferInstruction] : []),
    ],
  }).compileToV0Message(addressLookupTableAccounts)
}
