"use client"

import { useOneWallet } from "@/lib/wallet"
import { useSuiClient } from "@onelabs/dapp-kit"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Wallet, Copy, ExternalLink, Coins } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { useLanguage } from "@/components/providers/language-provider"

export function WalletInfo() {
    const { address, isConnected, isConnecting, connectWallet, disconnectWallet } = useOneWallet()
    const { toast } = useToast()
    const client = useSuiClient()
    const [balance, setBalance] = useState<string>("0")
    const [isLoadingBalance, setIsLoadingBalance] = useState(false)
    const { messages } = useLanguage()

    // Fetch OCT balance when wallet connects
    useEffect(() => {
        const fetchBalance = async () => {
            if (!address || !client) return

            setIsLoadingBalance(true)
            try {
                // Try to get OCT coins first
                let coins = await client.getCoins({
                    owner: address,
                    coinType: "0x2::oct::OCT",
                })

                // If no OCT coins, try SUI coin type as fallback
                if (coins.data.length === 0) {
                    coins = await client.getCoins({
                        owner: address,
                        coinType: "0x2::sui::SUI",
                    })
                }

                // If still no coins, try without coinType
                if (coins.data.length === 0) {
                    coins = await client.getCoins({
                        owner: address,
                    })
                }

                if (coins.data.length > 0) {
                    // Calculate total balance in OCT (convert from MIST)
                    const totalBalance = coins.data.reduce((sum, coin) => {
                        return sum + parseInt(coin.balance)
                    }, 0)

                    const balanceInOCT = (totalBalance / 1_000_000_000).toFixed(4)
                    setBalance(balanceInOCT)
                } else {
                    setBalance("0")
                }
            } catch (error) {
                console.error("Error fetching balance:", error)
                setBalance("0")
            } finally {
                setIsLoadingBalance(false)
            }
        }

        fetchBalance()
    }, [address, client])

    const copyAddress = () => {
        if (address) {
            navigator.clipboard.writeText(address)
            toast({
                title: messages.wallet_info.address_copied_title,
                description: messages.wallet_info.address_copied_desc,
            })
        }
    }

    if (!isConnected) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        {messages.wallet_info.connect_title}
                    </CardTitle>
                    <CardDescription>
                        {messages.wallet_info.connect_description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={connectWallet}
                        disabled={isConnecting}
                        className="w-full"
                    >
                        {isConnecting ? messages.wallet_info.connect_button_connecting : messages.wallet_info.connect_button_default}
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    {messages.wallet_info.connected_title}
                </CardTitle>
                <CardDescription>
                    {messages.wallet_info.connected_description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{messages.wallet_info.status_label}</span>
                        <Badge variant="default" className="bg-green-500">
                            {messages.wallet_info.status_connected}
                        </Badge>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm font-medium">{messages.wallet_info.balance_label}</span>
                        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
                            <Coins className="h-4 w-4 text-primary" />
                            <span className="text-lg font-bold text-primary">
                                {isLoadingBalance ? messages.wallet_info.balance_loading : `${balance} OCT`}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <span className="text-sm font-medium">{messages.wallet_info.address_label}</span>
                        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                            <code className="text-xs flex-1">{address}</code>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={copyAddress}
                                className="h-6 w-6 p-0"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`https://onescan.cc/testnet/account?address=${address}`, '_blank')}
                        className="flex-1"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {messages.wallet_info.view_explorer}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={disconnectWallet}
                        className="flex-1"
                    >
                        {messages.wallet_info.disconnect}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
