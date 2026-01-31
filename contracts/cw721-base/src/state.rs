use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Addr, Decimal, Timestamp};
use cw_storage_plus::{Item, Map};

/// Contract configuration
#[cw_serde]
pub struct Config {
    /// Contract name
    pub name: String,
    /// Contract symbol
    pub symbol: String,
    /// Minter address - can mint new tokens
    pub minter: Addr,
    /// Collection owner - can update config
    pub owner: Addr,
    /// Whether minting is enabled
    pub minting_enabled: bool,
    /// Maximum supply (None = unlimited)
    pub max_supply: Option<u64>,
    /// Current token count
    pub token_count: u64,
}

/// Royalty information for secondary sales
#[cw_serde]
pub struct RoyaltyInfo {
    /// Address to receive royalties
    pub payment_address: Addr,
    /// Royalty percentage (0-100)
    pub share: Decimal,
}

/// NFT trait/attribute
#[cw_serde]
pub struct Trait {
    /// Trait type (e.g., "Background", "Eyes")
    pub trait_type: String,
    /// Trait value (e.g., "Blue", "Rare")
    pub value: String,
    /// Display type (optional, e.g., "number", "boost_percentage")
    pub display_type: Option<String>,
}

/// NFT metadata extension
#[cw_serde]
pub struct Metadata {
    /// Image URL (IPFS preferred)
    pub image: Option<String>,
    /// External URL for the NFT
    pub external_url: Option<String>,
    /// NFT description
    pub description: Option<String>,
    /// NFT name
    pub name: Option<String>,
    /// Background color (hex without #)
    pub background_color: Option<String>,
    /// Animation URL for animated NFTs
    pub animation_url: Option<String>,
    /// YouTube URL (if applicable)
    pub youtube_url: Option<String>,
    /// NFT attributes/traits
    pub attributes: Option<Vec<Trait>>,
    /// Royalty info for this specific token
    pub royalty_info: Option<RoyaltyInfo>,
}

/// Token information stored on-chain
#[cw_serde]
pub struct TokenInfo {
    /// Token owner
    pub owner: Addr,
    /// Token URI (points to off-chain metadata)
    pub token_uri: Option<String>,
    /// On-chain metadata extension
    pub extension: Metadata,
    /// When the token was minted
    pub minted_at: Timestamp,
}

/// Approval for a specific token
#[cw_serde]
pub struct Approval {
    /// Address approved to transfer
    pub spender: Addr,
    /// When approval expires
    pub expires: Expiration,
}

/// Expiration for approvals
#[cw_serde]
pub enum Expiration {
    /// Never expires
    Never,
    /// Expires at specific block height
    AtHeight(u64),
    /// Expires at specific timestamp
    AtTime(Timestamp),
}

impl Expiration {
    pub fn is_expired(&self, block_height: u64, block_time: Timestamp) -> bool {
        match self {
            Expiration::Never => false,
            Expiration::AtHeight(height) => block_height >= *height,
            Expiration::AtTime(time) => block_time >= *time,
        }
    }
}

/// Operator approval (for all tokens)
#[cw_serde]
pub struct OperatorApproval {
    pub expires: Expiration,
}

// Storage keys
pub const CONFIG: Item<Config> = Item::new("config");
pub const TOKENS: Map<&str, TokenInfo> = Map::new("tokens");
pub const TOKEN_APPROVALS: Map<(&str, &Addr), Approval> = Map::new("token_approvals");
pub const OPERATOR_APPROVALS: Map<(&Addr, &Addr), OperatorApproval> = Map::new("operator_approvals");
pub const COLLECTION_ROYALTY: Item<RoyaltyInfo> = Item::new("collection_royalty");

// Indexes for efficient querying
pub const OWNER_TOKENS: Map<(&Addr, &str), bool> = Map::new("owner_tokens");
