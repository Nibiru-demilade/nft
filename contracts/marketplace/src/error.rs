use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug, PartialEq)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),

    #[error("Unauthorized")]
    Unauthorized {},

    #[error("Listing not found: {nft_contract}/{token_id}")]
    ListingNotFound { nft_contract: String, token_id: String },

    #[error("Listing already exists: {nft_contract}/{token_id}")]
    ListingAlreadyExists { nft_contract: String, token_id: String },

    #[error("Offer not found")]
    OfferNotFound {},

    #[error("Listing has expired")]
    ListingExpired {},

    #[error("Offer has expired")]
    OfferExpired {},

    #[error("Auction has not ended yet")]
    AuctionNotEnded {},

    #[error("Auction has already ended")]
    AuctionEnded {},

    #[error("Bid must be higher than current bid: {current}")]
    BidTooLow { current: u128 },

    #[error("Bid must meet reserve price: {reserve}")]
    BidBelowReserve { reserve: u128 },

    #[error("Insufficient funds: required {required}, sent {sent}")]
    InsufficientFunds { required: u128, sent: u128 },

    #[error("Invalid price: must be greater than zero")]
    InvalidPrice {},

    #[error("Invalid duration: must be between {min} and {max} seconds")]
    InvalidDuration { min: u64, max: u64 },

    #[error("Invalid fee percentage: must be between 0 and 100")]
    InvalidFeePercentage {},

    #[error("Wrong denom: expected {expected}, got {got}")]
    WrongDenom { expected: String, got: String },

    #[error("Cannot buy your own listing")]
    CannotBuyOwnListing {},

    #[error("Cannot bid on your own auction")]
    CannotBidOnOwnAuction {},

    #[error("Contract is paused")]
    Paused {},

    #[error("NFT not approved for marketplace")]
    NotApproved {},

    #[error("Dutch auction: price has not decreased enough")]
    DutchPriceNotReached {},
}
