module anime_merchandise::anime_nft {
    use std::string::{Self, String};
    use std::vector;
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::url::{Self, Url};
    
    // OneChain OCT native token type
    // OCT is the native gas token on OneChain (Sui fork)
    public struct OCT has drop {}

    // Error codes
    const EInsufficientBalance: u64 = 0;
    const EInvalidRoyaltyPercentage: u64 = 1;
    const EItemNotFound: u64 = 2;
    const EUnauthorized: u64 = 3;

    // Struct for anime merchandise metadata
    struct AnimeMerchandise has store, key {
        id: UID,
        name: String,
        description: String,
        image_url: Url,
        rarity: u8, // 1-5 scale
        creator: address,
        royalty_percentage: u64, // Basis points (100 = 1%)
        total_supply: u64,
        minted_count: u64,
        price: u64, // Price in OCT
        category: String, // "figurine", "poster", "apparel"
        series: String,
        release_date: u64,
        authenticity_code: vector<u8>
    }

    // Struct for individual NFT tokens
    struct AnimeNFT has store, key {
        id: UID,
        merchandise_id: ID,
        token_id: u64,
        owner: address,
        mint_date: u64,
        authenticity_proof: vector<u8>
    }

    // Struct for marketplace
    struct Marketplace has key {
        id: UID,
        items: Table<ID, AnimeMerchandise>,
        listings: Table<ID, Listing>,
        total_items: u64,
        total_listings: u64
    }

    // Struct for NFT listings
    struct Listing has store {
        nft: AnimeNFT,
        seller: address,
        price: u64,
        listed_at: u64
    }

    // Struct for royalty distribution
    struct RoyaltyPool has key {
        id: UID,
        creator: address,
        balance: Balance<OCT>,
        total_earned: u64
    }

    // Events
    struct ItemCreated has copy, drop {
        item_id: ID,
        name: String,
        creator: address,
        price: u64
    }

    struct NFTMinted has copy, drop {
        nft_id: ID,
        merchandise_id: ID,
        token_id: u64,
        owner: address
    }

    struct NFTSold has copy, drop {
        nft_id: ID,
        seller: address,
        buyer: address,
        price: u64
    }

    struct NFTListed has copy, drop {
        listing_id: ID,
        nft_id: ID,
        seller: address,
        price: u64
    }

    struct NFTUnlisted has copy, drop {
        listing_id: ID,
        nft_id: ID
    }

    struct RoyaltyPaid has copy, drop {
        creator: address,
        amount: u64,
        nft_id: ID
    }

    // Capability for marketplace operations
    struct MarketplaceCap has key, store {
        id: UID
    }

    // Initialize marketplace
    fun init(ctx: &mut TxContext) {
        let marketplace = Marketplace {
            id: object::new(ctx),
            items: table::new(ctx),
            listings: table::new(ctx),
            total_items: 0,
            total_listings: 0
        };
        
        transfer::share_object(marketplace);
        
        // Create marketplace capability
        let cap = MarketplaceCap {
            id: object::new(ctx)
        };
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    // Create new anime merchandise item
    public fun create_item(
        cap: &mut MarketplaceCap,
        marketplace: &mut Marketplace,
        name: String,
        description: String,
        image_url: Url,
        rarity: u8,
        royalty_percentage: u64,
        total_supply: u64,
        price: u64,
        category: String,
        series: String,
        release_date: u64,
        authenticity_code: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(royalty_percentage <= 1000, EInvalidRoyaltyPercentage); // Max 10%
        assert!(rarity >= 1 && rarity <= 5, EInvalidRoyaltyPercentage);
        
        let item = AnimeMerchandise {
            id: object::new(ctx),
            name,
            description,
            image_url,
            rarity,
            creator: tx_context::sender(ctx),
            royalty_percentage,
            total_supply,
            minted_count: 0,
            price,
            category,
            series,
            release_date,
            authenticity_code
        };
        
        let item_id = object::id(&item);
        table::add(&mut marketplace.items, item_id, item);
        marketplace.total_items = marketplace.total_items + 1;
        
        event::emit(ItemCreated {
            item_id,
            name: string::utf8(b""), // Placeholder
            creator: tx_context::sender(ctx),
            price
        });
    }

    // Mint NFT from merchandise item
    public fun mint_nft(
        cap: &mut MarketplaceCap,
        marketplace: &mut Marketplace,
        merchandise_id: ID,
        ctx: &mut TxContext
    ): AnimeNFT {
        let item = table::borrow_mut(&mut marketplace.items, merchandise_id);
        assert!(item.minted_count < item.total_supply, EItemNotFound);
        
        let nft = AnimeNFT {
            id: object::new(ctx),
            merchandise_id,
            token_id: item.minted_count + 1,
            owner: tx_context::sender(ctx),
            mint_date: tx_context::epoch(ctx),
            authenticity_proof: item.authenticity_code
        };
        
        item.minted_count = item.minted_count + 1;
        marketplace.total_nfts = marketplace.total_nfts + 1;
        
        let nft_id = object::id(&nft);
        event::emit(NFTMinted {
            nft_id,
            merchandise_id,
            token_id: nft.token_id,
            owner: tx_context::sender(ctx)
        });
        
        nft
    }

    // Transfer NFT ownership
    public fun transfer_nft(
        nft: AnimeNFT,
        recipient: address,
        ctx: &mut TxContext
    ) {
        transfer::transfer(nft, recipient);
    }

    // List NFT for sale
    public entry fun list_nft(
        marketplace: &mut Marketplace,
        nft: AnimeNFT,
        price: u64,
        ctx: &mut TxContext
    ) {
        let nft_id = object::id(&nft);
        let listing_id = object::new(ctx);
        let listing_id_copy = object::uid_to_inner(&listing_id);
        
        let listing = Listing {
            nft,
            seller: tx_context::sender(ctx),
            price,
            listed_at: tx_context::epoch(ctx)
        };
        
        table::add(&mut marketplace.listings, listing_id_copy, listing);
        marketplace.total_listings = marketplace.total_listings + 1;
        
        event::emit(NFTListed {
            listing_id: listing_id_copy,
            nft_id,
            seller: tx_context::sender(ctx),
            price
        });
        
        object::delete(listing_id);
    }

    // Buy NFT from marketplace
    public entry fun buy_nft(
        marketplace: &mut Marketplace,
        listing_id: ID,
        payment: Coin<OCT>,
        ctx: &mut TxContext
    ) {
        let listing = table::remove(&mut marketplace.listings, listing_id);
        let Listing { nft, seller, price, listed_at: _ } = listing;
        
        // Verify payment amount
        assert!(coin::value(&payment) >= price, EInsufficientBalance);
        
        // Transfer payment to seller
        transfer::public_transfer(payment, seller);
        
        // Transfer NFT to buyer
        let nft_id = object::id(&nft);
        let buyer = tx_context::sender(ctx);
        transfer::transfer(nft, buyer);
        
        marketplace.total_listings = marketplace.total_listings - 1;
        
        event::emit(NFTSold {
            nft_id,
            seller,
            buyer,
            price
        });
    }

    // Unlist NFT
    public entry fun unlist_nft(
        marketplace: &mut Marketplace,
        listing_id: ID,
        ctx: &mut TxContext
    ) {
        let listing = table::remove(&mut marketplace.listings, listing_id);
        let Listing { nft, seller, price: _, listed_at: _ } = listing;
        
        assert!(seller == tx_context::sender(ctx), EUnauthorized);
        
        let nft_id = object::id(&nft);
        transfer::transfer(nft, seller);
        
        marketplace.total_listings = marketplace.total_listings - 1;
        
        event::emit(NFTUnlisted {
            listing_id,
            nft_id
        });
    }

    // Get merchandise item
    public fun get_item(marketplace: &Marketplace, item_id: ID): &AnimeMerchandise {
        table::borrow(&marketplace.items, item_id)
    }

    // Get total items count
    public fun get_total_items(marketplace: &Marketplace): u64 {
        marketplace.total_items
    }

    // Get total listings count
    public fun get_total_listings(marketplace: &Marketplace): u64 {
        marketplace.total_listings
    }
}
