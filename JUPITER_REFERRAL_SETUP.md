# Jupiter Referral System Setup

## Overview

The Solana Starter Kit now includes Jupiter's referral program integration, allowing you to earn referral fees from swaps executed through your application. This system works alongside the existing SSE (Solana Starter Ecosystem) token handling infrastructure.

## Configuration

### 1. Set up the Environment Variable

https://referral.jup.ag/ sign up

https://referral.jup.ag/dashboard copy referralAccount id at the top 

to claim fees on unverified tokens use the sdk example:

https://github.com/TeamRaccoons/referral/tree/main/example

Add the following to your `.env` file:

```env
# Jupiter Referral Configuration
# Add your Jupiter referral account public key here to earn referral fees (2.51%)
NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT=YourReferralAccountPublicKeyHere
```

### 2. Referral Fee Details

- **Default Referral Fee**: 251 basis points (2.51%) can be set between 90-255 basis points.
- **Fee Collection**: Automatically collected from swaps when `NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT` is set and can be claimed via the referral dashboard
- **No Configuration**: If `NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT` is not set, no referral fees are collected all fees go to Jup at their default rate.
- **Fallback Account**: If no environment variable is set, fees go to the default account `3i9DA5ddTXwDLdaKRpK9BA4oXumVpPWWGuyD3YKxPs1j`

### 3. How It Works

1. The system uses Jupiter's `platformFeeBps` approach in the quote API instead of the referral parameters in the swap API
2. This avoids conflicts between platform fees and referral fees that can occur when both are used simultaneously
3. The referral fee is set in the quote request and automatically handled by Jupiter
4. Jupiter v6 API honors the platform fee from the quote phase, ensuring proper fee collection

## Dual Fee System Architecture

The Solana Starter Kit implements **two separate fee systems** that work together:

### 1. **Referral Fees** (Jupiter Swap Fees)
- **Purpose**: Earn revenue from swap transactions
- **Amount**: 2.51% of the swap output amount
- **Collection**: Automatically deducted from swap output and sent to your referral account
- **Implementation**: Uses `platformFeeBps` in Jupiter quote API
- **Configuration**: `NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT` environment variable

### 2. **ATA Creation Fees** (SSE Infrastructure Fees)
- **Purpose**: Pay for Associated Token Account (ATA) creation when needed
- **Amount**: Network fees for account creation (typically ~0.002 SOL)
- **Collection**: Paid by the `JUPITER_CONFIG.FEE_WALLET` account
- **Implementation**: Used in `getCreateATAInstructions` function
- **Configuration**: Hardcoded in `src/config/jupiter.ts`

### How They Work Together

```typescript
// 1. Quote API includes referral fee
const QUOTE_URL = `
  https://quote-api.jup.ag/v6/quote?
  inputMint=${inputMint}&
  outputMint=${outputMint}&
  amount=${inputAmountInDecimals}&
  platformFeeBps=${REFERRAL_FEE_BPS}&        // 2.51% to your referral account
  feeAccount=${REFERRAL_ACCOUNT}&
  swapMode=${swapMode}
`

// 2. ATA creation uses separate fee wallet
const { ata: outputAta, instructions: ataInstructions } =
  await getCreateATAInstructions(
    connection,
    new PublicKey(request.walletAddress),
    new PublicKey(request.mintAddress),
    new PublicKey(JUPITER_CONFIG.FEE_WALLET),  // Separate account pays for ATA creation
  )
```

### 4. Implementation Details

The referral system is implemented using the **platformFeeBps approach**:

- **`src/components/trade/hooks/jupiter/use-jupiter-swap.ts`**: Uses `platformFeeBps` and `feeAccount` in the quote API
- **`src/services/jupiter.ts`**: Uses the direct swap API without conflicting referral parameters
- **`src/services/swap.ts`**: Handles ATA creation with separate fee wallet
- **`src/config/jupiter.ts`**: Contains SSE infrastructure configuration
- **Quote API**: Includes `platformFeeBps=251&feeAccount=YourReferralAccount` in the quote request
- **Swap API**: Uses the quote response without additional referral parameters

### 5. Technical Details

**Why platformFeeBps instead of referralAccount/referralFeeBps?**

Jupiter v6 API doesn't support both `platformFeeBps` and `referralAccount/referralFeeBps` simultaneously. When both are specified:
- Jupiter only honors the platform fee from the quote phase
- The referral parameters in the swap phase are ignored
- This can result in no fees being collected or fees going to the wrong account

**Our Solution:**
- Use `platformFeeBps` in the quote API with your referral account as the `feeAccount`
- Remove conflicting referral parameters from the swap API
- This ensures reliable fee collection to your referral account

**SSE Token Support:**
- The system maintains support for SSE token handling
- ATA creation costs are paid by `JUPITER_CONFIG.FEE_WALLET`
- SSE token accounts and fees are handled separately from referral fees
- Both systems can operate simultaneously without conflicts

### 6. Configuration Files

#### `src/config/jupiter.ts` - SSE Infrastructure Configuration
```typescript
export const JUPITER_CONFIG = {
  // Platform fee configuration (for ATA creation)
  PLATFORM_FEE_BPS: 100, // 1%
  MIN_PLATFORM_FEE_BPS: 1, // Minimum fee when using SSE
  FEE_WALLET: '8jTiTDW9ZbMHvAD9SZWvhPfRx5gUgK7HACMdgbFp2tUz', // Pays for ATA creation

  // SSE token configuration
  SSE_TOKEN_MINT: 'H4phNbsqjV5rqk8u6FUACTLB6rNZRTAPGnBb8KXJpump',

  // Transaction configuration
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
  DEFAULT_PRIORITY_LEVEL: 'Medium' as const,
}
```

#### `src/components/trade/hooks/jupiter/use-jupiter-swap.ts` - Referral Configuration
```typescript
// Jupiter v6 API uses platformFeeBps in the quote API for fee collection
export const REFERRAL_ACCOUNT = process.env.NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT || '3i9DA5ddTXwDLdaKRpK9BA4oXumVpPWWGuyD3YKxPs1j' #BCT Referral Account can be modified to your own
export const REFERRAL_FEE_BPS = 251 // 2.51% referral fee
```

### 7. Testing

To test the referral system:

1. Set your `NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT` in the `.env` file
2. Execute a swap through the application
3. Check the transaction on Solscan to verify the referral fee was collected
4. Monitor your referral account for incoming fees
5. Use the [Jupiter referral dashboard](https://referral.jup.ag/dashboard) to track earnings

### 8. Important Notes

- The referral account must be a valid Solana wallet address
- Referral fees are collected in the output token of the swap
- The system uses Jupiter's direct swap API for optimal performance
- The `NEXT_PUBLIC_` prefix is required since this is used in the frontend code
- Fees are set at quote time, not swap time, for better reliability
- **SSE token handling remains fully functional** alongside the referral system
- ATA creation costs are separate from referral fees and paid by the infrastructure

## Fee Flow Diagram

```
User Swap Transaction
│
├── Swap Output Amount (100%)
│   │
│   ├── User Receives (97.49%)
│   └── Referral Fee (2.51%) → Your Referral Account
│
└── ATA Creation (if needed)
    └── Network Fee (~0.002 SOL) → Paid by JUPITER_CONFIG.FEE_WALLET
```

## Troubleshooting

### Referral fees not being collected

1. Verify `NEXT_PUBLIC_JUP_REFERRAL_ACCOUNT` is set correctly in your `.env` file
2. Ensure the environment variable is loaded (restart your development server)
3. Check the quote URL in browser developer tools to verify the parameters are included
4. Verify the referral account address is correct and active

### Invalid referral account error

1. Ensure the referral account is a valid Solana public key
2. The account should be a standard wallet address, not a token account
3. Test the account address on [Solscan](https://solscan.io) to verify it exists

### Fees going to wrong account

1. Check that you're not mixing `platformFeeBps` and `referralAccount` parameters
2. Verify the environment variable name includes the `NEXT_PUBLIC_` prefix
3. Clear browser cache and restart the development server

### ATA creation issues

1. Ensure `JUPITER_CONFIG.FEE_WALLET` has sufficient SOL for account creation
2. Check that the fee wallet has the necessary permissions
3. Verify the token program is correctly identified for Token 2022 vs SPL tokens

## Commit History and Attribution

This implementation resolves the Jupiter v6 API conflict issue identified in the original commit by [@rxdha1](https://github.com/rxdha1) and the [Bonk Computer](https://cc.bonk.computer) team on this commit of their project code fork of the Solana Starter Kit @https://github.com/Primitives-xyz/solana-starter-kit/commit/81f3f244a2b4dbee948ef9c9e9576d955de9830b:

**Original Issue**: The code was trying to use both `platformFeeBps` (0.8% to one account) and `referralAccount/referralFeeBps` (2.51% to another account) simultaneously, which Jupiter v6 API doesn't support.

**Solution Implemented**: 
- Use only the `platformFeeBps` approach in the quote API
- Set it to use your referral account with 2.51% fee
- Remove conflicting referral parameters from the swap API call
- Maintain SSE token infrastructure for ATA creation

**Key Changes**:
- All swaps now correctly collect a 2.51% fee
- Fee is sent to your configured referral account
- Works for both external wallets and Privy embedded wallets
- Enhanced error handling for insufficient SOL balance
- Maintains backward compatibility with SSE token handling

## Support

For more information about Jupiter's referral program, visit:
- Jupiter Documentation: https://station.jup.ag/docs
- Jupiter Referral Dashboard: https://referral.jup.ag/
- Jupiter Referral SDK: https://github.com/TeamRaccoons/referral 
- This contribution comes from the Rxdha1 and the chads https://cc.bonk.computer commit https://github.com/Primitives-xyz/solana-starter-kit/commit/81f3f244a2b4dbee948ef9c9e9576d955de9830b now refined here for the Solana-Starter-Kit.

Built with ❤️ by Bonk Computer, powered by Tapestry 