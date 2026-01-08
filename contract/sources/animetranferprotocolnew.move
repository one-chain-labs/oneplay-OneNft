/*
/// Module: animetranferprotocolnew
module animetranferprotocolnew::animetranferprotocolnew;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions

module anime::animetranferprotocolnew;

/*
/// Module: animemerchandisenew
module animemerchandisenew::animemerchandisenew;
*/

// For Move coding conventions, see
// https://docs.sui.io/concepts/sui-move-concepts/conventions


// https://cdn.prod.website-files.com/65217fd9e31608b8b68141ba/65217fd9e31608b8b68144d0_i-MgfRu-cKGNV-nlBp0-3xXHdeU-tb0RDv4Gejz6TNm5y9rgIw_9u25nK0vS5yrtCy4C4R8pbXeTlU5aU_NsH0XQWrxEJJjHw5_GfLPyI2JZfNPGtJ0Jd5OROkuwQJenyfj4VLixhN6_auyAfHtvQ0e91g%3Ds2048.png

/*
Functions:
    1. Purchase Land
    2. Transfer Land
    3. Get Land Details.

    4. Apply for permits
    5. Start constructions
        Constructions will be of
            a. Buildings (flat)
            b. Manufacturing
            c. Marketing bord
            d. Agri-culture
    6. Publish Ads 
*/

use std::string::String;
use one::table;
use one::object::{Self, UID, ID};
use one::coin::{Self, Coin};
use one::oct::OCT;
use one::tx_context::TxContext;
use one::transfer;

const E_NOT_OWNER:u64 = 100;
const E_PAY_FINE:u64 = 101;
const E_NFT_MINTED:u64 = 102;
const E_BILL_BOARD_NOT_ACTIVE:u64 = 103;
const E_INSUFFICIENT_PAYMENT:u64 = 104;
const E_INVALID_PRICE:u64 = 105;
const E_NOT_AVAILABLE:u64 = 106;

// public enum LandType has store{
//     Agricultural,
//     Residential,
//     Commercial,
//     Industrial
// }

const AGRICULTURAL:u8 = 11;
const RESIDENTAL:u8 = 12;
const COMMERCIAL:u8 = 13;
const INDUSTRIAL:u8 = 14;
const RTOKEN:u256 = 5_000; // RTOKEN when user mints NFT.

public struct IsResident has key{
    id:UID,
    status:bool
}

public struct LandData has key, store{
    id:UID,
    uid:u256,
    url:String,
    owner:address
}

public struct NftCount has key {
    id:UID,
    next_uid:u256
}
public struct CoOrdinates has drop, copy, store {
    x:u16,
    y:u16
}
// Mapping for the LandRegistry 
public struct LandRegistry has key, store {
    id: UID,
    lands: table::Table<CoOrdinates, UID>,  
}

public struct LandRegistryAddress has key, store {
    id: UID,
    lands: table::Table<address, vector<UID>>,  
}


// A listing object for sale
    public struct Listing has key, store{
        id: UID,
        land: LandData,  // holds the land object temporarily
        price: u256,      // price in MIST (1 SUI = 1_000_000_000 MIST)
        seller: address,
    }

fun init(ctx: &mut TxContext) {
    let reg = NftCount { id:object::new(ctx), next_uid: 0};
    let land_reg = LandRegistry{
        id:object::new(ctx),
        lands:table::new(ctx)
    };
    let land_reg_add = LandRegistryAddress{
        id:object::new(ctx),
        lands:table::new(ctx)
    };
    
    transfer::share_object(land_reg);
    transfer::share_object(land_reg_add);
    transfer::share_object(reg);

}

public fun mint_nft(url:String, nftCount: &NftCount, registory: &mut LandRegistry, landRegistryAddress: &mut LandRegistryAddress,ctx: &mut TxContext, ) {
    // User must transfer some amount of token here first.abort
    

    let uid_ = nftCount.next_uid + 1;

    let user_land = LandData {
        id: object::new(ctx),
        uid:uid_,
        url,
        owner:ctx.sender(),
    };
    // table::add(&mut registory.lands,co_ordinates, object::new(ctx));
    transfer::transfer(user_land, ctx.sender());

}

public fun has_nft(land_registry_address: &LandRegistryAddress, owner: address): bool {
    table::contains(&land_registry_address.lands, owner)
}

public fun transfer_nft(land: LandData, recipient:address, ctx: &mut TxContext) {

    assert!(land.owner == ctx.sender(), E_NOT_OWNER);
    transfer::transfer(land, recipient);
}

public fun list_for_sale(landData: LandData, price:u256, ctx: &mut TxContext) {
        // Listing object itself owning the nft now.
    let seller = ctx.sender();
    assert!(landData.owner == seller, E_NOT_OWNER);
    let listing = Listing {
        id: object::new(ctx),
        land: landData,  // *OWNERSHIP TRANSFER*: NFT moved into Listing
        price,
        seller,
    };
    transfer::share_object(listing);

}



public fun purchase_listed_nft( listing: Listing, ctx: &mut TxContext ) {
    let buyer = ctx.sender();

    let Listing { id, land: mut land, price, seller } = listing;
    land.owner = buyer; //sui token deduction and adding
    
    transfer::transfer(land, buyer);
    object::delete(id); //Deleting the listing object
}



public fun get_owner(land: &LandData): address {
    land.owner
}


public fun get_url(land: &LandData): String {
    land.url
}

//contract address = 0xdea1f89b2d22e15e7f0ffff0ad630dce705f7c7d308a7ced4500aea68ccc4e55

//mint_nft => contract mint unique object - 0xece4b50e9e0feca889c263b627695548fa75e885e046d6db90565d05b536e60d

//latest contract address => 0x02c23edcb0cc861f892d22776d83e21e5b6a953c17e6b2011b5721b608c6fc64

//mint_nft ==> contract mint unique object - 0xa3ee3b924ecf5e86e3ba28626f6cefde9bab64cac2dc112f2d75f87c8187e246