# Solana Starter Kit

Welcome to the **Solana Starter Kit**! This guide is designed to help you quickly start building blockchain applications on Solana by providing a comprehensive template and clear, step-by-step instructions.

## User Journey

### 1. Clone the Repo

Clone the repository in your preferred code editor to start working with the code locally. Use the following commands:

```bash
git clone https://github.com/Primitives-xyz/solana-starter-kit
cd solana-starter-kit
```

### 2. Get API Keys

At this stage, you need to sign up for API keys from each infrastructure partner required for your project. Use the links below to sign up:

- **Privy**: Web3 authentication and embedded wallet infrastructure – <a href="https://dashboard.privy.io" target="_blank">Sign up for Privy</a>
- **Para**: OAuth-based web3 wallet infrastructure – <a href="https://developer.getpara.com/" target="_blank">Get your Para API key</a>
- **Tapestry**: Social graph and onchain identity API – <a href="https://app.usetapestry.dev/" target="_blank">Get Early Access at Tapestry</a>
- **Jupiter**: Open source liquidity and trading API – <a href="https://portal.jup.ag" target="_blank">Get your Jupiter API key</a>
- **Helius**: Real-time Solana RPC platform - <a href="https://dashboard.helius.dev/" target="_blank">Sign up at Helius</a>

### 3. Configure Environment

Rename the `.env.example` file to `.env.local` and update it with your API credentials:

```bash
cp .env.example .env.local
```

Then open the `.env.local` file and replace the placeholder values with your actual API keys. For Next.js applications, any environment variables used in the browser must be prefixed with `NEXT_PUBLIC_`.

### 4. Add Docs to Cursor

Navigate to Cursor > Cursor Settings > Features > Docs

Add the following docs URLs so Cursor can access them at any time:

- **Privy**: https://docs.privy.io/

- **Para**: https://docs.getpara.com/

- **Tapestry**: https://docs.usetapestry.dev/api

- **Zerion**: https://developers.zerion.io/reference/intro/getting-started

- **0x**: https://0x.org/docs/api

- **Helius**: https://docs.helius.dev/

### 5. Install Dependencies and Get Started

Install dependencies and run the development server to begin coding:

```bash
pnpm install
pnpm run dev
```

Now you're all set to start coding! Begin by exploring the codebase, and use our documentation to guide your development.

## Para Wallet Integration

This starter kit includes a seamless integration with the [Para Wallet SDK](https://developer.getpara.com/), providing OAuth-based authentication with social login options. Para offers a modern approach to wallet connectivity with enterprise-grade security.

### Para Key Features:
- **OAuth Authentication**: Connect via Google, Twitter, Apple, Discord, Facebook, and Farcaster
- **Email/Phone Login**: Traditional authentication methods for broader user adoption
- **Embedded Wallets**: Automatically generated Solana wallets for authenticated users
- **Transaction Signing**: Native Solana transaction signing capabilities
- **Recovery Options**: Built-in wallet recovery mechanisms
- **On-Ramp Integration**: Fiat-to-crypto purchase flows (test mode enabled)

### Para Configuration:

1. **Get Para API Key**: Visit [Para Developer Portal](https://developer.getpara.com/) to obtain your API key
2. **Add to Environment**: Set `NEXT_PUBLIC_PARA_API_KEY` in your `.env.local`
3. **Customize Theme**: The integration includes a custom dark theme matching the app design

### Para Implementation Details:

- **ParaProvider** (`src/components/provider/ParaProvider.tsx`): Main context provider managing Para authentication state
- **Header Integration** (`src/components/common/header.tsx`): Dual login buttons for both Privy and Para
- **Para Signer Hook** (`src/hooks/useParaSigner.ts`): Custom hook for Solana transaction signing with Para
- **Unified Logout**: Single logout function handling both wallet types

### Dual Wallet Architecture

The application intelligently handles both Para and Privy wallet types:

```typescript
// Users can connect with either Para or Privy
const isParaConnected = account?.isConnected && wallet
const isPrivyConnected = authenticated

// Unified logout handles both wallet types
const handleLogout = async () => {
  if (isParaConnected) {
    await logoutAsync() // Para logout
  }
  if (isPrivyConnected) {
    logout() // Privy logout
  }
}
```

### Benefits of Dual Integration:

1. **User Choice**: Let users choose their preferred authentication method
2. **Broader Adoption**: Support both Web3 natives (Privy) and mainstream users (Para)
3. **Fallback Options**: If one service has issues, users can use the alternative
4. **Testing**: Compare user experience and conversion rates between platforms

This dual approach provides maximum flexibility and ensures your dApp can serve the widest possible user base.

## Environment Variables

For a complete list of environment variables and their setup instructions, please refer to the [.env.example](.env.example) file in the root directory.

### Required Para Configuration:

```bash
# Para Wallet Configuration - Required for Para integration
NEXT_PUBLIC_PARA_API_KEY=your_para_api_key_here
NEXT_PUBLIC_PARA_ENVIRONMENT=BETA  # or PRODUCTION
```

**Para API Key Setup**: Visit [Para Developer Portal](https://developer.getpara.com/) to get your API key.

## NFT Portfolio Viewer Setup

For the NFT portfolio viewer to work correctly, you need to obtain a Helius API key:

1. Visit [Helius Developer Portal](https://dev.helius.xyz/dashboard) and create an account
2. Create a new API key
3. Add the key to your `.env.local` file:

```
NEXT_PUBLIC_HELIUS_API_KEY=your_api_key_here
```

This allows the application to fetch NFT data from the Solana blockchain using Helius's DAS API.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

We welcome contributions to the Solana Starter Kit! By contributing, you agree that your contributions will be licensed under the MIT License. Please feel free to submit issues, fork the repository, and create pull requests.
