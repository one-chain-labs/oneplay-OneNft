"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Wallet } from "lucide-react"
import Link from "next/link"
import { WalletInfo } from "@/components/wallet/wallet-info"
import { useLanguage } from "@/components/providers/language-provider"
import { currentNetwork } from "@/lib/onelabs"

export default function HomePage() {
  const { messages } = useLanguage()
  const isMainnet = currentNetwork === 'mainnet';
  console.log("Current Network:", currentNetwork);
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 md:py-32">
        <div className="container px-4 mx-auto">
          <div className="flex flex-col items-center text-center">
            <Badge variant="secondary" className="mb-4">
              {isMainnet ? messages.home.hero.badge_mainnet : messages.home.hero.badge_testnet}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              {messages.home.hero.title_prefix}
              <span className="text-primary block">{messages.home.hero.title_highlight}</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              {messages.home.hero.description}
            </p>
          </div>
        </div>
      </section>

      {/* Wallet Connection Section */}
      <section className="py-16 bg-muted/30">
        <div className="container px-4 mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{messages.home.integration.title}</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {messages.home.integration.description}
            </p>
          </div>

          <div className="flex justify-center">
            <WalletInfo />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-background border-t">
        <div className="container px-4 mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Wallet className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{messages.common.anime}</span>
          </div>
          <p className="text-muted-foreground">
            {isMainnet ? messages.home.footer.powered_by_mainnet : messages.home.footer.powered_by_testnet}
          </p>
        </div>
      </footer>
    </div>
  )
}


