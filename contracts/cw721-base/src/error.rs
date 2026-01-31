use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Token already exists: {token_id}")]
    TokenAlreadyExists { token_id: String },

    #[error("Token not found: {token_id}")]
    TokenNotFound { token_id: String },

    #[error("Invalid royalty percentage: must be between 0 and 100")]
    InvalidRoyaltyPercentage {},

    #[error("Approval not found for: {spender}")]
    ApprovalNotFound { spender: String },

    #[error("Token is not transferable")]
    NotTransferable {},

    #[error("Cannot set approval expiration in the past")]
    Expired {},

    #[error("Batch size exceeds maximum allowed: {max}")]
    BatchSizeExceeded { max: u32 },

    #[error("Invalid metadata: {reason}")]
    InvalidMetadata { reason: String },

    #[error("Minting is disabled")]
    MintingDisabled {},
}
