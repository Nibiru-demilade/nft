use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Coin, Decimal, Uint128};
use crate::state::{AuctionState, CollectionOffer, CollectionStats, Listing, ListingType, Offer, Sale};

#[cw_serde]
pub struct InstantiateMsg {
    /// Fee collector address (defaults to sender)
    pub fee_collector: Option<String>,
    /// Platform fee percentage (e.g., "0.025" for 2.5%)
    pub platform_fee: Decimal,
    /// Minimum listing duration in seconds (default: 1 hour)
    pub min_duration: Option<u64>,
    /// Maximum listing duration in seconds (default: 180 days)
    pub max_duration: Option<u64>,
    /// Accepted payment denoms (default: ["unibi"])
    pub accepted_denoms: Option<Vec<String>>,
}

#[cw_serde]
pub enum ExecuteMsg {
    // ============ LISTING OPERATIONS ============
    
    /// List an NFT for fixed price sale
    ListFixedPrice {
        nft_contract: String,
        token_id: String,
        price: Coin,
        /// Duration in seconds
        duration: u64,
    },
    
    /// List an NFT for English auction
    ListAuction {
        nft_contract: String,
        token_id: String,
        /// Starting price
        starting_price: Coin,
        /// Reserve price (minimum acceptable final bid)
        reserve_price: Option<Uint128>,
        /// Minimum bid increment
        min_increment: Option<Uint128>,
        /// Duration in seconds
        duration: u64,
    },
    
    /// List an NFT for Dutch auction (declining price)
    ListDutchAuction {
        nft_contract: String,
        token_id: String,
        /// Starting (highest) price
        start_price: Coin,
        /// Ending (lowest) price
        end_price: Uint128,
        /// Duration in seconds
        duration: u64,
    },
    
    /// Cancel a listing
    CancelListing {
        nft_contract: String,
        token_id: String,
    },
    
    /// Update listing price (fixed price only)
    UpdatePrice {
        nft_contract: String,
        token_id: String,
        new_price: Coin,
    },
    
    // ============ BUYING OPERATIONS ============
    
    /// Buy a fixed price listing or Dutch auction
    Buy {
        nft_contract: String,
        token_id: String,
    },
    
    /// Place a bid on an English auction
    PlaceBid {
        nft_contract: String,
        token_id: String,
    },
    
    /// Accept the highest bid and end auction early
    AcceptBid {
        nft_contract: String,
        token_id: String,
    },
    
    /// Settle an ended auction (transfer NFT to winner)
    SettleAuction {
        nft_contract: String,
        token_id: String,
    },
    
    // ============ OFFER OPERATIONS ============
    
    /// Make an offer on any NFT (listed or not)
    MakeOffer {
        nft_contract: String,
        token_id: String,
        /// Duration in seconds
        duration: u64,
    },
    
    /// Cancel an offer and get refund
    CancelOffer {
        nft_contract: String,
        token_id: String,
    },
    
    /// Accept an offer (by NFT owner)
    AcceptOffer {
        nft_contract: String,
        token_id: String,
        bidder: String,
    },
    
    /// Make a collection-wide offer
    MakeCollectionOffer {
        collection: String,
        /// Max NFTs to buy
        quantity: u32,
        /// Duration in seconds
        duration: u64,
    },
    
    /// Cancel a collection offer
    CancelCollectionOffer {
        collection: String,
    },
    
    /// Accept a collection offer (by any NFT owner in collection)
    AcceptCollectionOffer {
        collection: String,
        token_id: String,
        bidder: String,
    },
    
    // ============ ADMIN OPERATIONS ============
    
    /// Update contract configuration
    UpdateConfig {
        owner: Option<String>,
        fee_collector: Option<String>,
        platform_fee: Option<Decimal>,
        min_duration: Option<u64>,
        max_duration: Option<u64>,
        accepted_denoms: Option<Vec<String>>,
    },
    
    /// Pause/unpause the contract
    SetPaused {
        paused: bool,
    },
    
    /// Emergency withdraw (admin only)
    EmergencyWithdraw {
        recipient: String,
        amount: Coin,
    },
}

/// Message received when an NFT is sent to this contract
#[cw_serde]
pub enum Cw721HookMsg {
    /// List the received NFT
    List {
        price: Coin,
        duration: u64,
        listing_type: ListingType,
        reserve_price: Option<Uint128>,
        min_increment: Option<Uint128>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get contract configuration
    #[returns(ConfigResponse)]
    Config {},
    
    /// Get a specific listing
    #[returns(ListingResponse)]
    Listing {
        nft_contract: String,
        token_id: String,
    },
    
    /// Get listing by ID
    #[returns(ListingResponse)]
    ListingById {
        listing_id: u64,
    },
    
    /// List all listings with optional filters
    #[returns(ListingsResponse)]
    Listings {
        /// Filter by collection
        collection: Option<String>,
        /// Filter by seller
        seller: Option<String>,
        /// Filter by listing type
        listing_type: Option<String>,
        /// Minimum price
        min_price: Option<Uint128>,
        /// Maximum price
        max_price: Option<Uint128>,
        /// Only active (not expired)
        active_only: Option<bool>,
        start_after: Option<u64>,
        limit: Option<u32>,
    },
    
    /// Get offers on an NFT
    #[returns(OffersResponse)]
    Offers {
        nft_contract: String,
        token_id: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get offers made by a user
    #[returns(OffersResponse)]
    UserOffers {
        user: String,
        start_after: Option<u64>,
        limit: Option<u32>,
    },
    
    /// Get a specific offer
    #[returns(OfferResponse)]
    Offer {
        nft_contract: String,
        token_id: String,
        bidder: String,
    },
    
    /// Get collection offers
    #[returns(CollectionOffersResponse)]
    CollectionOffers {
        collection: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get collection statistics
    #[returns(CollectionStatsResponse)]
    CollectionStats {
        collection: String,
    },
    
    /// Get recent sales
    #[returns(SalesResponse)]
    Sales {
        collection: Option<String>,
        start_after: Option<u64>,
        limit: Option<u32>,
    },
    
    /// Get user's escrowed funds
    #[returns(EscrowResponse)]
    Escrow {
        user: String,
    },
    
    /// Get current Dutch auction price
    #[returns(DutchPriceResponse)]
    DutchPrice {
        nft_contract: String,
        token_id: String,
    },
}

// Response types

#[cw_serde]
pub struct ConfigResponse {
    pub owner: String,
    pub fee_collector: String,
    pub platform_fee: Decimal,
    pub min_duration: u64,
    pub max_duration: u64,
    pub accepted_denoms: Vec<String>,
    pub paused: bool,
}

#[cw_serde]
pub struct ListingResponse {
    pub listing: Option<Listing>,
}

#[cw_serde]
pub struct ListingsResponse {
    pub listings: Vec<Listing>,
}

#[cw_serde]
pub struct OfferResponse {
    pub offer: Option<Offer>,
}

#[cw_serde]
pub struct OffersResponse {
    pub offers: Vec<Offer>,
}

#[cw_serde]
pub struct CollectionOffersResponse {
    pub offers: Vec<CollectionOffer>,
}

#[cw_serde]
pub struct CollectionStatsResponse {
    pub stats: Option<CollectionStats>,
}

#[cw_serde]
pub struct SalesResponse {
    pub sales: Vec<Sale>,
}

#[cw_serde]
pub struct EscrowResponse {
    pub total: Vec<Coin>,
}

#[cw_serde]
pub struct DutchPriceResponse {
    pub current_price: Uint128,
    pub denom: String,
}
