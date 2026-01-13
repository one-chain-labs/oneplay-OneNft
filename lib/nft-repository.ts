import { supabase } from "./supabase"

export interface NFTData {
  nft_object_id: string
  name: string
  description?: string
  image_url: string
  category: string
  rarity: string
  series?: string
  character?: string
  manufacturer?: string
  release_year?: number
  owner_address: string
  creator_address: string
  status: "minted" | "listed" | "owned" | "sold"
  price_oct?: number
  listing_price_oct?: number
  listing_id?: string
  mint_tx_digest?: string
  list_tx_digest?: string
  purchase_tx_digest?: string
  created_at?: string
}

export interface NFTTransaction {
  nft_object_id: string
  type: "mint" | "list" | "purchase"
  tx_digest: string
  actor_address: string
  price_oct?: number
  created_at?: string
}

export interface NFTWithTransactions extends NFTData {
  transactions?: NFTTransaction[]
}

/**
 * Save a newly minted NFT to Supabase
 */
export async function saveMintedNFT(data: NFTData): Promise<NFTData> {
  const { data: nft, error } = await supabase
    .from("nfts")
    .insert({
      nft_object_id: data.nft_object_id,
      name: data.name,
      description: data.description || null,
      image_url: data.image_url,
      category: data.category,
      rarity: data.rarity,
      series: data.series || null,
      character: data.character || null,
      manufacturer: data.manufacturer || null,
      release_year: data.release_year || null,
      owner_address: data.owner_address,
      creator_address: data.creator_address,
      status: data.status,
      mint_tx_digest: data.mint_tx_digest || null,
    })
    .select()
    .single()

  if (error) {
    console.error("Error saving minted NFT:", error)
    throw new Error(`Failed to save NFT: ${error.message}`)
  }

  return nft as NFTData
}

/**
 * Log a transaction to the nft_transactions table
 */
export async function logTransaction(transaction: NFTTransaction): Promise<void> {
  const { error } = await supabase.from("nft_transactions").insert({
    nft_object_id: transaction.nft_object_id,
    type: transaction.type,
    tx_digest: transaction.tx_digest,
    actor_address: transaction.actor_address,
    price_oct: transaction.price_oct || null,
  })

  if (error) {
    console.error("Error logging transaction:", error)
    throw new Error(`Failed to log transaction: ${error.message}`)
  }
}

/**
 * Update NFT listing information
 */
export async function updateListing(
  nftObjectId: string,
  listingData: {
    listing_id: string
    listing_price_oct: number
    list_tx_digest: string
    status: "listed"
  }
): Promise<NFTData> {
  const { data: nft, error } = await supabase
    .from("nfts")
    .update({
      listing_id: listingData.listing_id,
      listing_price_oct: listingData.listing_price_oct,
      list_tx_digest: listingData.list_tx_digest,
      status: listingData.status,
      updated_at: new Date().toISOString(),
    })
    .eq("nft_object_id", nftObjectId)
    .select()
    .single()

  if (error) {
    console.error("Error updating listing:", error)
    throw new Error(`Failed to update listing: ${error.message}`)
  }

  return nft as NFTData
}

/**
 * Complete a purchase - update ownership and clear listing
 */
export async function completePurchase(
  nftObjectId: string,
  purchaseData: {
    owner_address: string
    purchase_tx_digest: string
    status: "owned"
  }
): Promise<NFTData> {
  const { data: nft, error } = await supabase
    .from("nfts")
    .update({
      owner_address: purchaseData.owner_address,
      purchase_tx_digest: purchaseData.purchase_tx_digest,
      status: purchaseData.status,
      listing_id: null,
      listing_price_oct: null,
      list_tx_digest: null,
      updated_at: new Date().toISOString(),
    })
    .eq("nft_object_id", nftObjectId)
    .select()
    .single()

  if (error) {
    console.error("Error completing purchase:", error)
    throw new Error(`Failed to complete purchase: ${error.message}`)
  }

  return nft as NFTData
}

/**
 * Fetch all listed NFTs for marketplace
 */
export async function fetchMarketplaceListings(): Promise<NFTData[]> {
  const { data: nfts, error } = await supabase
    .from("nfts")
    .select("*")
    .eq("status", "listed")
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching marketplace listings:", error)
    throw new Error(`Failed to fetch listings: ${error.message}`)
  }

  return (nfts || []) as NFTData[]
}

/**
 * Fetch NFT by object ID
 */
export async function fetchNFTByObjectId(nftObjectId: string): Promise<NFTData | null> {
  const { data: nft, error } = await supabase
    .from("nfts")
    .select("*")
    .eq("nft_object_id", nftObjectId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null
    }
    console.error("Error fetching NFT:", error)
    throw new Error(`Failed to fetch NFT: ${error.message}`)
  }

  return nft as NFTData
}

/**
 * Fetch NFT by Supabase ID
 */
export async function fetchNFTById(id: string): Promise<NFTData | null> {
  console.log("Fetching NFT by ID:", id)
  const { data: nft, error } = await supabase
    .from("nfts")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error fetching NFT:", error)
    throw new Error(`Failed to fetch NFT: ${error.message}`)
  }

  return nft as NFTData
}

/**
 * Fetch NFTs owned by an address
 */
export async function fetchOwnedNFTs(ownerAddress: string): Promise<NFTData[]> {
  const { data: nfts, error } = await supabase
    .from("nfts")
    .select("*")
    .eq("owner_address", ownerAddress)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching owned NFTs:", error)
    throw new Error(`Failed to fetch owned NFTs: ${error.message}`)
  }

  return (nfts || []) as NFTData[]
}

/**
 * Fetch transaction history for an NFT
 */
export async function fetchNFTTransactions(nftObjectId: string): Promise<NFTTransaction[]> {
  const { data: transactions, error } = await supabase
    .from("nft_transactions")
    .select("*")
    .eq("nft_object_id", nftObjectId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching transactions:", error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return (transactions || []) as NFTTransaction[]
}

/**
 * Fetch NFT with full transaction history
 */
export async function fetchNFTWithTransactions(nftObjectId: string): Promise<NFTWithTransactions | null> {
  const nft = await fetchNFTByObjectId(nftObjectId)
  if (!nft) return null

  const transactions = await fetchNFTTransactions(nftObjectId)

  return {
    ...nft,
    transactions,
  }
}

/**
 * Find NFT by listing ID
 */
export async function findNFTByListingId(listingId: string): Promise<NFTData | null> {
  const { data: nft, error } = await supabase
    .from("nfts")
    .select("*")
    .eq("listing_id", listingId)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      return null
    }
    console.error("Error finding NFT by listing ID:", error)
    throw new Error(`Failed to find NFT: ${error.message}`)
  }

  return nft as NFTData
}

// Type aliases for backward compatibility
export type NftRecord = NFTData
export type NftTransactionRecord = NFTTransaction

// Alias functions for backward compatibility
export const markNFTListed = updateListing
export const markNFTPurchased = completePurchase
export const fetchTransactionsForNft = fetchNFTTransactions

/**
 * Fetch transactions for an address (all NFTs owned by that address)
 */
export async function fetchTransactionsForAddress(address: string): Promise<NFTTransaction[]> {
  // Query transactions directly by actor_address
  const { data: transactions, error } = await supabase
    .from("nft_transactions")
    .select("*")
    .eq("actor_address", address)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching transactions for address:", error)
    throw new Error(`Failed to fetch transactions: ${error.message}`)
  }

  return (transactions || []) as NFTTransaction[]
}
