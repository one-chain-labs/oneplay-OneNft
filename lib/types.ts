export interface AnimeNFT {
  id: string
  name: string
  description: string
  imageUrl: string
  category: "art" | "PFP" | "assets" | "collectibles" | "utility" | "media" | "others"
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
  creator: string
  owner: string
  price?: number
  isListed: boolean
  createdAt: string
  attributes: {
    series: string
    character: string
    manufacturer?: string
    releaseYear?: number
    condition?: string
  }
}

export interface MarketplaceListing {
  id: string
  nftId: string
  seller: string
  price: number
  currency: "OCT"
  listedAt: string
  status: "active" | "sold" | "cancelled"
}

export interface User {
  address: string
  username?: string
  avatar?: string
  joinedAt: string
  nftsOwned: number
  nftsSold: number
  totalVolume: number
}

export interface TokenizationRequest {
  itemName: string
  description: string
  category: AnimeNFT["category"]
  rarity: AnimeNFT["rarity"]
  images: File[]
  attributes: {
    series: string
    character: string
    manufacturer?: string
    releaseYear?: number
    condition?: string
  }
  physicalVerification: {
    photos: File[]
    certificates?: File[]
    provenanceDocuments?: File[]
  }
}

export interface StoredNft {
  id: string
  nft_object_id: string
  name: string
  description?: string | null
  image_url?: string | null
  category?: AnimeNFT["category"] | null
  rarity?: AnimeNFT["rarity"] | null
  series?: string | null
  character?: string | null
  manufacturer?: string | null
  release_year?: number | null
  condition?: string | null
  creator_address: string
  owner_address: string
  status: "minted" | "listed" | "owned" | "sold"
  price_oct?: number | null
  listing_price_oct?: number | null
  listing_id?: string | null
  mint_tx_digest?: string | null
  list_tx_digest?: string | null
  purchase_tx_digest?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface NftTransaction {
  id: string
  nft_object_id: string
  type: "mint" | "list" | "purchase"
  tx_digest: string
  actor_address: string
  price_oct?: number | null
  created_at: string
}
