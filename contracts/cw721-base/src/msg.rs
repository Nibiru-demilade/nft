use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Addr, Binary, Decimal};
use crate::state::{Expiration, Metadata, RoyaltyInfo, Trait};

#[cw_serde]
pub struct InstantiateMsg {
    /// Collection name
    pub name: String,
    /// Collection symbol
    pub symbol: String,
    /// Minter address
    pub minter: String,
    /// Collection owner (defaults to minter if not provided)
    pub owner: Option<String>,
    /// Maximum supply (None = unlimited)
    pub max_supply: Option<u64>,
    /// Default royalty for the collection
    pub royalty_info: Option<RoyaltyInfoMsg>,
}

#[cw_serde]
pub struct RoyaltyInfoMsg {
    pub payment_address: String,
    /// Percentage as decimal string (e.g., "0.05" for 5%)
    pub share: Decimal,
}

#[cw_serde]
pub enum ExecuteMsg {
    /// Mint a new NFT
    Mint {
        token_id: String,
        owner: String,
        token_uri: Option<String>,
        extension: Metadata,
    },
    
    /// Batch mint multiple NFTs (gas efficient)
    BatchMint {
        tokens: Vec<MintMsg>,
    },
    
    /// Transfer NFT to another address
    TransferNft {
        recipient: String,
        token_id: String,
    },
    
    /// Send NFT to a contract with a message
    SendNft {
        contract: String,
        token_id: String,
        msg: Binary,
    },
    
    /// Approve an address to transfer a specific token
    Approve {
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    },
    
    /// Remove approval for a specific token
    Revoke {
        spender: String,
        token_id: String,
    },
    
    /// Approve an address to transfer all tokens
    ApproveAll {
        operator: String,
        expires: Option<Expiration>,
    },
    
    /// Remove operator approval
    RevokeAll {
        operator: String,
    },
    
    /// Burn a token (only owner or approved)
    Burn {
        token_id: String,
    },
    
    /// Update token metadata (only owner)
    UpdateMetadata {
        token_id: String,
        token_uri: Option<String>,
        extension: Option<Metadata>,
    },
    
    /// Update collection config (only contract owner)
    UpdateConfig {
        minter: Option<String>,
        owner: Option<String>,
        minting_enabled: Option<bool>,
        max_supply: Option<u64>,
    },
    
    /// Update collection royalty (only contract owner)
    UpdateRoyalty {
        royalty_info: Option<RoyaltyInfoMsg>,
    },
}

#[cw_serde]
pub struct MintMsg {
    pub token_id: String,
    pub owner: String,
    pub token_uri: Option<String>,
    pub extension: Metadata,
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum QueryMsg {
    /// Get contract config
    #[returns(ConfigResponse)]
    Config {},
    
    /// Get NFT info
    #[returns(NftInfoResponse)]
    NftInfo { token_id: String },
    
    /// Get all NFT info including owner
    #[returns(AllNftInfoResponse)]
    AllNftInfo { token_id: String },
    
    /// Get owner of a token
    #[returns(OwnerOfResponse)]
    OwnerOf { token_id: String },
    
    /// List all tokens owned by an address
    #[returns(TokensResponse)]
    Tokens {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// List all tokens in the collection
    #[returns(TokensResponse)]
    AllTokens {
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get approval for a specific token
    #[returns(ApprovalResponse)]
    Approval {
        token_id: String,
        spender: String,
    },
    
    /// Get all approvals for a token
    #[returns(ApprovalsResponse)]
    Approvals { token_id: String },
    
    /// Check if operator is approved for all tokens
    #[returns(OperatorResponse)]
    Operator { owner: String, operator: String },
    
    /// List all operators for an owner
    #[returns(OperatorsResponse)]
    AllOperators {
        owner: String,
        start_after: Option<String>,
        limit: Option<u32>,
    },
    
    /// Get total token count
    #[returns(NumTokensResponse)]
    NumTokens {},
    
    /// Get contract info (name, symbol)
    #[returns(ContractInfoResponse)]
    ContractInfo {},
    
    /// Get royalty info for a token
    #[returns(RoyaltyInfoResponse)]
    RoyaltyInfo { token_id: String, sale_price: u128 },
    
    /// Get collection royalty info
    #[returns(CollectionRoyaltyResponse)]
    CollectionRoyalty {},
}

// Response types
#[cw_serde]
pub struct ConfigResponse {
    pub name: String,
    pub symbol: String,
    pub minter: String,
    pub owner: String,
    pub minting_enabled: bool,
    pub max_supply: Option<u64>,
    pub token_count: u64,
}

#[cw_serde]
pub struct NftInfoResponse {
    pub token_uri: Option<String>,
    pub extension: Metadata,
}

#[cw_serde]
pub struct AllNftInfoResponse {
    pub access: OwnerOfResponse,
    pub info: NftInfoResponse,
}

#[cw_serde]
pub struct OwnerOfResponse {
    pub owner: String,
    pub approvals: Vec<ApprovalMsg>,
}

#[cw_serde]
pub struct ApprovalMsg {
    pub spender: String,
    pub expires: Expiration,
}

#[cw_serde]
pub struct TokensResponse {
    pub tokens: Vec<String>,
}

#[cw_serde]
pub struct ApprovalResponse {
    pub approval: ApprovalMsg,
}

#[cw_serde]
pub struct ApprovalsResponse {
    pub approvals: Vec<ApprovalMsg>,
}

#[cw_serde]
pub struct OperatorResponse {
    pub approved: bool,
    pub expires: Option<Expiration>,
}

#[cw_serde]
pub struct OperatorsResponse {
    pub operators: Vec<OperatorMsg>,
}

#[cw_serde]
pub struct OperatorMsg {
    pub operator: String,
    pub expires: Expiration,
}

#[cw_serde]
pub struct NumTokensResponse {
    pub count: u64,
}

#[cw_serde]
pub struct ContractInfoResponse {
    pub name: String,
    pub symbol: String,
}

#[cw_serde]
pub struct RoyaltyInfoResponse {
    pub payment_address: String,
    pub royalty_amount: u128,
}

#[cw_serde]
pub struct CollectionRoyaltyResponse {
    pub royalty_info: Option<RoyaltyInfo>,
}
