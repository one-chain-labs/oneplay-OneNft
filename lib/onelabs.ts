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
  url: NETWORK_CONFIG.testnet.rpc,
})

// Load deployment info
let deploymentInfo: any = null
try {
  deploymentInfo = require("../deployment-info.json")
} catch {
  console.warn("Deployment info not found. Please deploy contract first.")
}

// NFT Contract metadata - Updated from finalproofpack.txt
// Contract address: 0x02c23edcb0cc861f892d22776d83e21e5b6a953c17e6b2011b5721b608c6fc64
// Module: animetranferprotocolnew
export const CONTRACT_ADDRESSES = {
  PACKAGE_ID: deploymentInfo?.packageId || "0xa4cf435971e08f658169a8066ef1be0ba980b4a0058aacc4c937d88707009a74",
  NFT_COUNT_ID: deploymentInfo?.nftCountId || "0x7a91e2442533369c3e5bf2b843af7813a6531e6d0c9dedc6bc00989daecaf07b",
  LAND_REGISTRY_ID: deploymentInfo?.landRegistryId || "0x3b48655e81ae2527f0086bac79c90a8afc289b405732082f3342d00ab9fc1e87",
  LAND_REGISTRY_ADDRESS_ID: deploymentInfo?.landRegistryAddressId || "0x70cc3943cafc6f26cca128048b04c0891caf40c2f797bb1f1bcefceb6d5a39d5",
  // Legacy fields for backward compatibility
  MARKETPLACE_ID: deploymentInfo?.marketplaceId || "",
  MARKETPLACE_CAP_ID: deploymentInfo?.marketplaceCapId || "",
}

export const CONTRACT_MODULE = deploymentInfo?.moduleName || "animetranferprotocolnew"

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
