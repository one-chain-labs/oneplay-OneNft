"use client"

import { NetworkConfig, SuiClientProvider, WalletProvider } from "@onelabs/dapp-kit"
import { getFullnodeUrl } from '@onelabs/sui/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactNode, useState } from "react"



interface OneChainProviderWrapperProps {
    children: ReactNode
}

export function OneChainProviderWrapper({ children }: OneChainProviderWrapperProps) {
    // Create a QueryClient instance for the WalletProvider
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                retry: 1,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            <SuiClientProvider
                networks={{
                    testnet: {
                        url: getFullnodeUrl('testnet'),
                    },
                    mainnet: {
                        url: getFullnodeUrl('mainnet'),
                    }
                }}
                defaultNetwork="mainnet"
            >
                <WalletProvider autoConnect>
                    {children}
                </WalletProvider>
            </SuiClientProvider>
        </QueryClientProvider>
    )
}
