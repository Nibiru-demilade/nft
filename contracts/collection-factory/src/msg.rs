use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Coin, Decimal};
use crate::state::{Collection, CollectionStatus, Socials};

#[cw_serde]
pub struct InstantiateMsg {
    /// Code ID of CW721 contract to instantiate for new collections
    pub cw721_code_id: u64,
    /// Fee to create a new collection (optional)
    pub creation_fee: Option<Coin>,
    /// Fee collector address (defaults to sender)
    pub fee_collector: Option<String>,
    /// Maximum royalty percentage allowed (default: 10%)
    pub max_royalty_percentage: Option<Decimal>,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Create a new NFT collection
    CreateCollection {
        /// Collection name
        name: String,
        /// Collection symbol
        symbol: String,
        /// Collection description
        description: Option<String>,
        /// Collection image URL (IPFS preferred)
        image: Option<String>,
        /// Banner image URL
        banner: Option<String>,
        /// External website URL
        external_url: Option<String>,
        /// Royalty percentage for secondary sales
        royalty_percentage: Decimal,
        /// Royalty recipient address (defaults to creator)
        royalty_recipient: Option<String>,
        /// Social media links
        socials: Option<Socials>,
        /// Category tags
        categories: Option<Vec<String>>,
        /// Maximum supply (None = unlimited)
        max_supply: Option<u64>,
    },
    
    /// Update collection metadata (only creator)
    UpdateCollection {
        /// Collection contract address
        collection: String,
        /// New description
        description: Option<String>,
        /// New image URL
        image: Option<String>,
        /// New banner URL
        banner: Option<String>,
        /// New external URL
        external_url: Option<String>,
        /// New social links
        socials: Option<Socials>,
        /// New categories
        categories: Option<Vec<String>>,
    },
    
    /// Update royalty info (only creator)
    UpdateRoyalty {
        /// Collection contract address
        collection: String,
        /// New royalty percentage
        royalty_percentage: Option<Decimal>,
        /// New royalty recipient
        royalty_recipient: Option<String>,
    },
    
    /// Verify a collection (admin only)
    VerifyCollection {
        collection: String,
    },
    
    /// Unverify a collection (admin only)
    UnverifyCollection {
        collection: String,
    },
    
    /// Flag a collection for review (admin only)
    FlagCollection {
        collection: String,
        reason: Option<String>,
    },
    
    /// Ban a collection (admin only)
    BanCollection {
        collection: String,
        reason: Option<String>,
    },
    
    /// Update factory configuration (admin only)
    UpdateConfig {
        owner: Option<String>,
        cw721_code_id: Option<u64>,
        creation_fee: Option<Coin>,
        fee_collector: Option<String>,
        max_royalty_percentage: Option<Decimal>,
    },
    
    /// Pause/unpause the factory (admin only)
    SetPaused {
        paused: bool,
    },
    
    /// Withdraw collected fees (admin only)
    WithdrawFees {
        recipient: Option<String>,
        amount: Option<Coin>,
    },
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get factory configuration
    #[returns(ConfigResponse)]
    Config {},
    
    /// Get collection by contract address
    #[returns(CollectionResponse)]
    Collection { address: String },
    
    /// Get collection by name
    #[returns(CollectionResponse)]
    CollectionByName { name: String },
    
    /// List all collections
    #[returns(CollectionsResponse)]
    Collections {
        /// Filter by creator
        creator: Option<String>,
        /// Filter by status
        status: Option<CollectionStatus>,
        /// Filter by category
        category: Option<String>,
        /// Only verified collections
        verified_only: Option<bool>,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get collections by creator
    #[returns(CollectionsResponse)]
    CreatorCollections {
        creator: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get all verified collections
    #[returns(CollectionsResponse)]
    VerifiedCollections {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get total collection count
    #[returns(CountResponse)]
    CollectionCount {},
    
    /// Check if a name is available
    #[returns(NameAvailableResponse)]
    NameAvailable { name: String },
}

// Response types

#[cw_serde]
pub struct ConfigResponse {
    pub owner: String,
    pub cw721_code_id: u64,
    pub creation_fee: Option<Coin>,
    pub fee_collector: String,
    pub paused: bool,
    pub max_royalty_percentage: Decimal,
}

#[cw_serde]
pub struct CollectionResponse {
    pub collection: Option<Collection>,
}

#[cw_serde]
pub struct CollectionsResponse {
    pub collections: Vec<Collection>,
}

#[cw_serde]
pub struct CountResponse {
    pub count: u64,
}

#[cw_serde]
pub struct NameAvailableResponse {
    pub available: bool,
}

/// CW721 instantiate message (for creating new collections)
#[cw_serde]
pub struct Cw721InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
    pub owner: Option<String>,
    pub max_supply: Option<u64>,
    pub royalty_info: Option<RoyaltyInfoMsg>,
}

#[cw_serde]
pub struct RoyaltyInfoMsg {
    pub payment_address: String,
    pub share: Decimal,
}
