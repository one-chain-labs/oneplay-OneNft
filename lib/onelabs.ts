import { SuiClient } from "@onelabs/sui/client"
import { Transaction } from "@onelabs/sui/transactions"
import type { Ed25519Keypair } from "@onelabs/sui/keypairs/ed25519"

// OneChain OCT Network configuration
// Reference: https://docs.onelabs.cc/RPC and https://docs.onelabs.cc/API
// Explorer: https://onescan.cc/testnet/
export const NETWORK_CONFIG = {
  testnet: {
    rpc: "https://rpc-testnet.onelabs.cc:443",
    faucet: "https://faucet-testnet.onelabs.cc:443",
    explorer: "https://onescan.cc/testnet",
    chainId: "0x1",
    name: "OneChain OCT Testnet",
    nativeCurrency: {
      name: "OCT",
      symbol: "OCT",
      decimals: 9
    }
  },
  mainnet: {
    rpc: "https://rpc.mainnet.onelabs.cc:443",
    faucet: null,
    explorer: "https://onescan.cc",
    chainId: "0x1",
    name: "OneChain OCT Mainnet",
    nativeCurrency: {
      name: "OCT",
      symbol: "OCT",
      decimals: 9
    }
  },
}

// Helper function to get explorer URL for transactions
export const getExplorerUrl = (type: 'transaction' | 'object' | 'account', id: string, network: 'testnet' | 'mainnet' = 'testnet'): string => {
  const baseUrl = NETWORK_CONFIG[network].explorer
  switch (type) {
    case 'transaction':
      return `${baseUrl}/transactionBlocksDetail?digest=${id}`
    case 'object':
      return `${baseUrl}/object/${id}`
    case 'account':
      return `${baseUrl}/account?address=${id}`
    default:
      return baseUrl
  }
}

// Initialize OneChain OCT client
export const suiClient = new SuiClient({
  url: process.env.NETWORK === 'mainnet' ? NETWORK_CONFIG.mainnet.rpc : NETWORK_CONFIG.testnet.rpc,
})
export const currentNetwork = process.env.NEXT_PUBLIC_NETWORK || '';
// Load deployment info
let deploymentInfo: any = null

 
// NFT Contract metadata - Updated from finalproofpack.txt
// Contract address: 0x02c23edcb0cc861f892d22776d83e21e5b6a953c17e6b2011b5721b608c6fc64
// Module: animetranferprotocolnew
export const CONTRACT_ADDRESSES = {
  PACKAGE_ID: process.env.NEXT_PUBLIC_PACKAGE_ID || "",
  NFT_COUNT_ID: process.env.NEXT_PUBLIC_NFT_COUNT_ID || "",
  LAND_REGISTRY_ID: process.env.NEXT_PUBLIC_LAND_REGISTRY_ID || "",
  LAND_REGISTRY_ADDRESS_ID: process.env.NEXT_PUBLIC_LAND_REGISTRY_ADDRESS_ID || "",
  // Legacy fields for backward compatibility
  MARKETPLACE_ID: process.env.NEXT_PUBLIC_MARKETPLACE_ID || "",
  MARKETPLACE_CAP_ID: process.env.NEXT_PUBLIC_MARKETPLACE_CAP_ID || "",
}

export const CONTRACT_MODULE = process.env.NEXT_PUBLIC_CONTRACT_MODULE || "animetranferprotocolnew"

export const contractTarget = (fnName: string) =>
  CONTRACT_ADDRESSES.PACKAGE_ID ? `${CONTRACT_ADDRESSES.PACKAGE_ID}::${CONTRACT_MODULE}::${fnName}` : ""

// Helper functions for NFT operations
export class AnimeNFTService {
  private client: SuiClient

  constructor(client: SuiClient) {
    this.client = client
  }

  // Mint new anime merchandise NFT
  async mintAnimeNFT(
    merchandiseId: string,
    signer?: Ed25519Keypair,
  ) {
    if (!CONTRACT_ADDRESSES.PACKAGE_ID) {
      // Return mock transaction if contract not deployed
      console.warn('Contract not deployed. Returning mock transaction for testing.')
      return Promise.resolve({
        digest: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        effects: { status: { status: 'success' } },
        objectChanges: [{
          type: 'created',
          objectId: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
          objectType: `${CONTRACT_ADDRESSES.PACKAGE_ID || 'MOCK'}::anime_nft::AnimeNFT`
        }]
      })
    }

    const tx = new Transaction()

    const [nft] = tx.moveCall({
      target: contractTarget("mint_nft"),
      arguments: [
        tx.object(CONTRACT_ADDRESSES.MARKETPLACE_CAP_ID),
        tx.object(CONTRACT_ADDRESSES.MARKETPLACE_ID),
        tx.pure.string(merchandiseId),
      ],
    })

    if (signer) {
      tx.transferObjects([nft], signer.toSuiAddress())
      
      const result = await this.client.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      })
      return result
    }

    return tx
  }

  // Get user's NFT collection
  async getUserNFTs(address: string) {
    if (!CONTRACT_ADDRESSES.PACKAGE_ID) {
      return []
    }

    const objects = await this.client.getOwnedObjects({
      owner: address,
      filter: {
        StructType: `${CONTRACT_ADDRESSES.PACKAGE_ID}::anime_nft::AnimeNFT`,
      },
      options: {
        showContent: true,
        showDisplay: true,
      },
    })

    return objects.data
  }

  // List NFT on marketplace
  async listNFT(nftId: string, price: number, signer?: Ed25519Keypair) {
    if (!CONTRACT_ADDRESSES.PACKAGE_ID) {
      // Return mock transaction if contract not deployed
      console.warn('Contract not deployed. Returning mock transaction for testing.')
      return Promise.resolve({
        digest: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        effects: { status: { status: 'success' } },
        events: [{ type: 'NFTListed', parsedJson: { nft_id: nftId, price } }]
      })
    }

    const tx = new Transaction()

    tx.moveCall({
      target: contractTarget("list_nft"),
      arguments: [
        tx.object(CONTRACT_ADDRESSES.MARKETPLACE_ID),
        tx.object(nftId),
        tx.pure.u64(price),
      ],
    })

    if (signer) {
      const result = await this.client.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })
      return result
    }

    return tx
  }

  // Purchase NFT from marketplace
  async purchaseNFT(listingId: string, price: number, signer?: Ed25519Keypair) {
    if (!CONTRACT_ADDRESSES.PACKAGE_ID) {
      // Return mock transaction if contract not deployed
      console.warn('Contract not deployed. Returning mock transaction for testing.')
      return Promise.resolve({
        digest: '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
        effects: { status: { status: 'success' } },
        events: [{ type: 'NFTSold', parsedJson: { listing_id: listingId, price } }]
      })
    }

    const tx = new Transaction()

    const [payment] = tx.splitCoins(tx.gas, [price])

    tx.moveCall({
      target: contractTarget("buy_nft"),
      arguments: [
        tx.object(CONTRACT_ADDRESSES.MARKETPLACE_ID),
        tx.pure.id(listingId),
        payment,
      ],
    })

    if (signer) {
      const result = await this.client.signAndExecuteTransaction({
        signer,
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      })
      return result
    }

    return tx
  }

  // Get marketplace listings
  async getMarketplaceListings() {
    if (!CONTRACT_ADDRESSES.MARKETPLACE_ID) {
      return []
    }

    try {
      const marketplace = await this.client.getObject({
        id: CONTRACT_ADDRESSES.MARKETPLACE_ID,
        options: {
          showContent: true,
        },
      })

      return marketplace
    } catch (error) {
      console.error('Failed to fetch marketplace:', error)
      return []
    }
  }

  // Request testnet SUI from faucet
  async requestFaucet(address: string) {
    try {
      const response = await fetch(`${NETWORK_CONFIG.testnet.faucet}/gas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          FixedAmountRequest: { recipient: address }
        })
      })

      if (response.ok) {
        return await response.json()
      }
      throw new Error('Faucet request failed')
    } catch (error) {
      console.error('Faucet error:', error)
      throw error
    }
  }
}

export const animeNFTService = new AnimeNFTService(suiClient)
