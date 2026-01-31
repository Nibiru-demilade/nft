use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin, Decimal, Timestamp, Uint128};
use cw_storage_plus::{Item, Map};

/// Marketplace configuration
#[cw_serde]
pub struct Config {
    /// Contract owner
    pub owner: Addr,
    /// Fee collector address
    pub fee_collector: Addr,
    /// Platform fee percentage (e.g., 0.025 for 2.5%)
    pub platform_fee: Decimal,
    /// Minimum listing duration in seconds
    pub min_duration: u64,
    /// Maximum listing duration in seconds
    pub max_duration: u64,
    /// Accepted payment denoms
    pub accepted_denoms: Vec<String>,
    /// Whether the contract is paused
    pub paused: bool,
}

/// Type of listing
#[cw_serde]
pub enum ListingType {
    /// Fixed price sale
    FixedPrice,
    /// English auction (ascending price)
    Auction,
    /// Dutch auction (descending price)
    DutchAuction {
        /// Starting price
        start_price: Uint128,
        /// End price (minimum)
        end_price: Uint128,
        /// Price decrease per second
        decline_rate: Uint128,
    },
}

/// Auction state for English auctions
#[cw_serde]
pub struct AuctionState {
    /// Current highest bidder
    pub highest_bidder: Option<Addr>,
    /// Current highest bid
    pub highest_bid: Uint128,
    /// Reserve price (minimum acceptable bid)
    pub reserve_price: Uint128,
    /// Minimum bid increment
    pub min_increment: Uint128,
}

/// A marketplace listing
#[cw_serde]
pub struct Listing {
    /// Unique listing ID
    pub id: u64,
    /// Seller address
    pub seller: Addr,
    /// NFT contract address
    pub nft_contract: Addr,
    /// Token ID
    pub token_id: String,
    /// Listing type
    pub listing_type: ListingType,
    /// Price (for fixed price) or starting price (for auctions)
    pub price: Coin,
    /// Auction state (only for English auctions)
    pub auction_state: Option<AuctionState>,
    /// When the listing was created
    pub created_at: Timestamp,
    /// When the listing expires
    pub expires_at: Timestamp,
    /// Royalty recipient
    pub royalty_recipient: Option<Addr>,
    /// Royalty percentage
    pub royalty_percentage: Option<Decimal>,
}

/// An offer on an NFT
#[cw_serde]
pub struct Offer {
    /// Unique offer ID
    pub id: u64,
    /// Bidder address
    pub bidder: Addr,
    /// NFT contract address
    pub nft_contract: Addr,
    /// Token ID
    pub token_id: String,
    /// Offer amount
    pub amount: Coin,
    /// When the offer was created
    pub created_at: Timestamp,
    /// When the offer expires
    pub expires_at: Timestamp,
}

/// Collection offer (bid on any NFT in a collection)
#[cw_serde]
pub struct CollectionOffer {
    /// Unique offer ID
    pub id: u64,
    /// Bidder address
    pub bidder: Addr,
    /// Collection contract address
    pub collection: Addr,
    /// Offer amount per NFT
    pub amount: Coin,
    /// Maximum number of NFTs to buy
    pub quantity: u32,
    /// Number of NFTs already bought
    pub filled: u32,
    /// When the offer was created
    pub created_at: Timestamp,
    /// When the offer expires
    pub expires_at: Timestamp,
}

/// Sale record for history
#[cw_serde]
pub struct Sale {
    pub nft_contract: Addr,
    pub token_id: String,
    pub seller: Addr,
    pub buyer: Addr,
    pub price: Coin,
    pub platform_fee: Uint128,
    pub royalty_fee: Uint128,
    pub timestamp: Timestamp,
}

// Storage keys

/// Contract configuration
pub const CONFIG: Item<Config> = Item::new("config");

/// Next listing ID counter
pub const LISTING_COUNT: Item<u64> = Item::new("listing_count");

/// Next offer ID counter
pub const OFFER_COUNT: Item<u64> = Item::new("offer_count");

/// Listings indexed by (nft_contract, token_id)
pub const LISTINGS: Map<(&Addr, &str), Listing> = Map::new("listings");

/// Listings indexed by ID for quick lookup
pub const LISTINGS_BY_ID: Map<u64, (Addr, String)> = Map::new("listings_by_id");

/// Listings by seller for user queries
pub const SELLER_LISTINGS: Map<(&Addr, u64), bool> = Map::new("seller_listings");

/// Offers indexed by (nft_contract, token_id, bidder)
pub const OFFERS: Map<(&Addr, &str, &Addr), Offer> = Map::new("offers");

/// Offers by ID
pub const OFFERS_BY_ID: Map<u64, (Addr, String, Addr)> = Map::new("offers_by_id");

/// Collection offers by (collection, bidder)
pub const COLLECTION_OFFERS: Map<(&Addr, &Addr), CollectionOffer> = Map::new("collection_offers");

/// Escrowed funds for offers: (bidder, offer_id) -> amount
pub const ESCROW: Map<(&Addr, u64), Coin> = Map::new("escrow");

/// Recent sales for analytics
pub const SALES: Map<u64, Sale> = Map::new("sales");

/// Sale count
pub const SALE_COUNT: Item<u64> = Item::new("sale_count");

/// Collection statistics
#[cw_serde]
pub struct CollectionStats {
    pub total_volume: Uint128,
    pub floor_price: Option<Uint128>,
    pub total_sales: u64,
    pub total_listings: u64,
}

pub const COLLECTION_STATS: Map<&Addr, CollectionStats> = Map::new("collection_stats");
