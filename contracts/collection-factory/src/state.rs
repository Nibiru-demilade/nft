use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Coin, Decimal, Timestamp};
use cw_storage_plus::{Item, Map};

/// Factory configuration
#[cw_serde]
pub struct Config {
    /// Contract owner/admin
    pub owner: Addr,
    /// Code ID of the CW721 contract to instantiate
    pub cw721_code_id: u64,
    /// Fee to create a new collection (optional)
    pub creation_fee: Option<Coin>,
    /// Fee collector address
    pub fee_collector: Addr,
    /// Whether the factory is paused
    pub paused: bool,
    /// Maximum royalty percentage allowed
    pub max_royalty_percentage: Decimal,
}

/// Collection verification status
#[cw_serde]
pub enum CollectionStatus {
    /// Not yet verified
    Unverified,
    /// Verified by platform
    Verified,
    /// Flagged for review
    Flagged,
    /// Banned from platform
    Banned,
}

impl Default for CollectionStatus {
    fn default() -> Self {
        CollectionStatus::Unverified
    }
}

/// Collection metadata stored in factory
#[cw_serde]
pub struct Collection {
    /// Collection contract address
    pub contract_address: Addr,
    /// Collection name
    pub name: String,
    /// Collection symbol
    pub symbol: String,
    /// Collection description
    pub description: Option<String>,
    /// Collection image URL (IPFS preferred)
    pub image: Option<String>,
    /// Banner image URL
    pub banner: Option<String>,
    /// External website URL
    pub external_url: Option<String>,
    /// Creator address
    pub creator: Addr,
    /// Royalty percentage for secondary sales
    pub royalty_percentage: Decimal,
    /// Royalty recipient address
    pub royalty_recipient: Addr,
    /// Verification status
    pub status: CollectionStatus,
    /// When the collection was created
    pub created_at: Timestamp,
    /// Social links
    pub socials: Option<Socials>,
    /// Category tags
    pub categories: Vec<String>,
}

/// Social media links
#[cw_serde]
pub struct Socials {
    pub twitter: Option<String>,
    pub discord: Option<String>,
    pub telegram: Option<String>,
    pub website: Option<String>,
}

/// Pending collection creation (during reply)
#[cw_serde]
pub struct PendingCollection {
    pub creator: Addr,
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub image: Option<String>,
    pub banner: Option<String>,
    pub external_url: Option<String>,
    pub royalty_percentage: Decimal,
    pub royalty_recipient: Addr,
    pub socials: Option<Socials>,
    pub categories: Vec<String>,
}

// Storage keys

/// Factory configuration
pub const CONFIG: Item<Config> = Item::new("config");

/// Collection count
pub const COLLECTION_COUNT: Item<u64> = Item::new("collection_count");

/// Collections by contract address
pub const COLLECTIONS: Map<&Addr, Collection> = Map::new("collections");

/// Collection address by name (for uniqueness check)
pub const COLLECTION_BY_NAME: Map<&str, Addr> = Map::new("collection_by_name");

/// Collections by creator
pub const CREATOR_COLLECTIONS: Map<(&Addr, &Addr), bool> = Map::new("creator_collections");

/// Verified collections list
pub const VERIFIED_COLLECTIONS: Map<&Addr, bool> = Map::new("verified_collections");

/// Pending collection during instantiation
pub const PENDING_COLLECTION: Item<PendingCollection> = Item::new("pending_collection");
