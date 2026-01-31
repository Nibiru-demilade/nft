use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Collection not found: {address}")]
    CollectionNotFound { address: String },

    #[error("Collection already exists: {name}")]
    CollectionAlreadyExists { name: String },

    #[error("Invalid royalty percentage: must be between 0 and 100")]
    InvalidRoyaltyPercentage {},

    #[error("Invalid collection name: {reason}")]
    InvalidName { reason: String },

    #[error("Invalid symbol: {reason}")]
    InvalidSymbol { reason: String },

    #[error("Code ID not set for CW721 contract")]
    CodeIdNotSet {},

    #[error("Creation fee required: {required}")]
    CreationFeeRequired { required: String },

    #[error("Contract is paused")]
    Paused {},

    #[error("Reply error: {msg}")]
    ReplyError { msg: String },
}
