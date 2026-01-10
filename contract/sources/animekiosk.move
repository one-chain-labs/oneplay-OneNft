module anime::market_kiosk;

use one::balance::{Self, Balance};
use one::coin::{Self, Coin};
use one::event;
use one::kiosk::{Self, Kiosk, KioskOwnerCap};
use one::transfer_policy::{Self, TransferPolicy};
use one::object::{Self, UID, ID};
use one::table::{Self, Table};
use one::transfer;
use one::tx_context::{Self, TxContext};
use std::type_name::{Self, TypeName};
use std::vector;
use one::oct::OCT;

/*********************************
     * 常量 & 错误码
     *********************************/

/// 平台手续费（bps）
const PLATFORM_FEE_BPS: u64 = 250; // 2.5%

const E_NOT_ADMIN: u64 = 0;
const E_NOT_ALLOWED_GAME: u64 = 1;

/*********************************
     * 管理员
     *********************************/

public struct AdminCap has key {
    id: UID,
}

/*********************************
     * 游戏白名单
     *********************************/

public struct GameRegistry has key {
    id: UID,
    allowed_packages: vector<address>,
}

/*********************************
     * 平台收益
     *********************************/

public struct PlatformProfit has key {
    id: UID,
    profit: Balance<OCT>,
}

/*********************************
     * ========== 事件定义 ==========
     *********************************/

/// NFT 被平台注册
public struct NFTRegistered has copy, drop {
    nft_id: ID,
    nft_type: TypeName,
    game_package: address,
    owner: address,
}

/// NFT 被放入 Kiosk
public struct NFTPlaced has copy, drop {
    nft_id: ID,
    kiosk_id: ID,
    owner: address,
}

/// NFT 上架
public struct NFTListed has copy, drop {
    nft_id: ID,
    kiosk_id: ID,
    price: u64,
}

/// NFT 下架
public struct NFTDelisted has copy, drop {
    nft_id: ID,
    kiosk_id: ID,
}

/// NFT 成交（最重要）
public struct NFTSold has copy, drop {
    nft_id: ID,
    seller: address,
    buyer: address,
    price: u64,
    fee_paid: u64,
}

/*********************************
     * 初始化
     *********************************/

public entry fun init(ctx: &mut TxContext) {
    // 管理员
    transfer::transfer(
        AdminCap { id: object::new(ctx) },
        tx_context::sender(ctx),
    );

    transfer::share_object(GameRegistry {
        id: object::new(ctx),
        allowed_packages: vector::empty(),
    });

    transfer::share_object(PlatformProfit {
        id: object::new(ctx),
        profit: balance::zero(),
    });
}

/*********************************
     * 游戏白名单
     *********************************/

public entry fun add_game(_admin: &AdminCap, registry: &mut GameRegistry, game_package: address) {
    vector::push_back(&mut registry.allowed_packages, game_package);
}

fun is_allowed_game(registry: &GameRegistry, nft_type: &TypeName): bool {
    vector::contains(
        &registry.allowed_packages,
        &type_name::address_of(nft_type),
    )
}

/*********************************
     * 创建用户 Kiosk
     *********************************/

public entry fun create_kiosk(ctx: &mut TxContext) {
    let (kiosk, cap) = kiosk::new(ctx);
    transfer::share_object(kiosk);
    transfer::public_transfer(cap, tx_context::sender(ctx));
}

/*********************************
     * NFT 注册（展示锚点）
     *********************************/

public entry fun register_nft<T: key>(nft: &T, game_registry: &GameRegistry, ctx: &mut TxContext) {
    let nft_type = type_name::get<T>();

    assert!(is_allowed_game(game_registry, &nft_type), E_NOT_ALLOWED_GAME);

    event::emit(NFTRegistered {
        nft_id: object::id(nft),
        nft_type,
        game_package: type_name::address_of(&nft_type),
        owner: tx_context::sender(ctx),
    });
}

/*********************************
     * NFT 放入 Kiosk
     *********************************/

public entry fun place_nft<T: key>(
    kiosk: &mut Kiosk,
    owner_cap: &KioskOwnerCap,
    nft: T,
    ctx: &mut TxContext,
) {
    let nft_id = object::id(&nft);
    let kiosk_id = object::id(kiosk);

    kiosk::place(kiosk, owner_cap, nft);

    event::emit(NFTPlaced {
        nft_id,
        kiosk_id,
        owner: tx_context::sender(ctx),
    });
}

/*********************************
     * 上架 NFT
     *********************************/

public entry fun list_nft<T: key>(
    kiosk: &mut Kiosk,
    owner_cap: &KioskOwnerCap,
    nft: &T,
    price: u64,
) {
    let nft_id = object::id(nft);
    let kiosk_id = object::id(kiosk);

    kiosk::list<T>(kiosk, owner_cap, nft, price);

    event::emit(NFTListed {
        nft_id,
        kiosk_id,
        price,
    });
}

/*********************************
     * 下架 NFT
     *********************************/

public entry fun delist_nft<T: key>(kiosk: &mut Kiosk, owner_cap: &KioskOwnerCap, nft: &T) {
    let nft_id = object::id(nft);
    let kiosk_id = object::id(kiosk);

    kiosk::delist<T>(kiosk, owner_cap, nft);

    event::emit(NFTDelisted {
        nft_id,
        kiosk_id,
    });
}

/*********************************
     * 创建 TransferPolicy（含平台手续费）
     *********************************/

public entry fun create_transfer_policy<T: key>(
    _admin: &AdminCap,
    game_registry: &GameRegistry,
    ctx: &mut TxContext,
) {
    let nft_type = type_name::get<T>();

    assert!(is_allowed_game(game_registry, &nft_type), E_NOT_ALLOWED_GAME);

    let (policy, cap) = transfer_policy::new<T>(ctx);

    // 平台手续费
    transfer_policy::add_rule<T>(
        &mut policy,
        &cap,
        Policy::Royalty {
            receiver: @nft_hub,
            fee_bps: PLATFORM_FEE_BPS,
        },
    );

    // 成交 Hook（发事件）
    transfer_policy::add_rule<T>(
        &mut policy,
        &cap,
        Policy::Custom {
            module: @nft_hub,
            function: b"on_transfer",
        },
    );

    transfer::share_object(policy);
    transfer::transfer(cap, tx_context::sender(ctx));
}

/*********************************
     * TransferPolicy Hook（成交事件）
     *********************************/

public fun on_transfer<T: key>(
    _policy: &TransferPolicy<T>,
    ctx: &mut TxContext,
    nft: &T,
    price: u64,
) {
    let fee = price * PLATFORM_FEE_BPS / 10_000;

    event::emit(NFTSold {
        nft_id: object::id(nft),
        seller: tx_context::sender(ctx),
        buyer: tx_context::recipient(ctx),
        price,
        fee_paid: fee,
    });
}

/*********************************
     * 接收平台手续费
     *********************************/

public entry fun receive_profit(profit: &mut PlatformProfit, coin: Coin<OCT>) {
    balance::join(&mut profit.profit, coin::into_balance(coin));
}

/*********************************
     * 提取平台收益
     *********************************/

public entry fun withdraw_profit(
    _admin: &AdminCap,
    profit: &mut PlatformProfit,
    amount: u64,
    ctx: &mut TxContext,
) {
    let coin = coin::from_balance(
        balance::split(&mut profit.profit, amount),
        ctx,
    );
    transfer::transfer(coin, tx_context::sender(ctx));
}
