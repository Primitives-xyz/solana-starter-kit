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
