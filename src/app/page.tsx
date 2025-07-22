import { ParaTransactionDemo } from "@/components/para-demo";
import { PopularTokensTable } from "@/components/token/popular-tokens-table";
import TokenChartSwapContainer from "@/components/trade/components/token-chart-swap-container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

// This is a server component (the default for page.tsx in Next.js App Router)
export default function Page() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <main className="flex-1">
        <section className="container py-8">
          <Suspense
            fallback={
              <div className="h-[500px] flex items-center justify-center">
                Loading chart and swap...
              </div>
            }
          >
            <TokenChartSwapContainer
              defaultTokenAddress="So11111111111111111111111111111111111111112" // SOL address
              defaultTokenSymbol="SOL"
            />
          </Suspense>
        </section>
        <section className="container py-8">
          <h2 className="text-2xl font-bold mb-6">Popular Tokens</h2>
          <PopularTokensTable />
        </section>
        <section className="container py-8">
          <h2 className="text-2xl font-bold mb-6">Recent Trades</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-background border-border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <Image
                          src="/placeholder.svg?height=24&width=24"
                          width={24}
                          height={24}
                          alt="Token"
                        />
                      </Avatar>
                      <span className="font-medium">SOL → USDC</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-card text-card-foreground border-border"
                    >
                      {Math.floor(Math.random() * 10) + 1}m ago
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Amount</span>
                    <span>{(Math.random() * 10).toFixed(2)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-zinc-400">Value</span>
                    <span>${(Math.random() * 1000).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-zinc-400">Price Impact</span>
                    <span className="text-green-500">
                      -0.{Math.floor(Math.random() * 10)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        {/* Add Para Transaction Demo Section */}
        <section className="container py-8">
          <h2 className="text-2xl font-bold mb-6">Para Wallet Transactions</h2>
          <Suspense
            fallback={
              <div className="h-[300px] flex items-center justify-center">
                Loading transaction demo...
              </div>
            }
          >
            <ParaTransactionDemo />
          </Suspense>
        </section>
      </main>
      <footer className="border-t border-zinc-800 py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <div className="absolute inset-0 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
            <span className="font-bold">SolanaSwap</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Docs
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Twitter
            </Link>
            <Link
              href="#"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Discord
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}