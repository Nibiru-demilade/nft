use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, CosmosMsg, Decimal, Deps, DepsMut,
    Env, MessageInfo, Order, Response, StdResult, Uint128, WasmMsg,
};
use cw2::set_contract_version;
use cw721::Cw721ExecuteMsg;

use crate::error::ContractError;
use crate::msg::{
    CollectionOffersResponse, CollectionStatsResponse, ConfigResponse, DutchPriceResponse,
    EscrowResponse, ExecuteMsg, InstantiateMsg, ListingResponse, ListingsResponse, OfferResponse,
    OffersResponse, QueryMsg, SalesResponse,
};
use crate::state::{
    AuctionState, CollectionStats, Config, Listing, ListingType, Offer, Sale,
    COLLECTION_OFFERS, COLLECTION_STATS, CONFIG, ESCROW, LISTING_COUNT, LISTINGS,
    LISTINGS_BY_ID, OFFERS, OFFERS_BY_ID, OFFER_COUNT, SALES, SALE_COUNT, SELLER_LISTINGS,
};

const CONTRACT_NAME: &str = "crates.io:nibiru-marketplace";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const DEFAULT_MIN_DURATION: u64 = 3600; // 1 hour
const DEFAULT_MAX_DURATION: u64 = 15552000; // 180 days
const DEFAULT_LIMIT: u32 = 30;
const MAX_LIMIT: u32 = 100;

#[entry_point]
pub fn instantiate(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    set_contract_version(deps.storage, CONTRACT_NAME, CONTRACT_VERSION)?;

    if msg.platform_fee > Decimal::percent(100) {
        return Err(ContractError::InvalidFeePercentage {});
    }

    let fee_collector = msg
        .fee_collector
        .map(|f| deps.api.addr_validate(&f))
        .transpose()?
        .unwrap_or_else(|| info.sender.clone());

    let accepted_denoms = msg
        .accepted_denoms
        .unwrap_or_else(|| vec!["unibi".to_string()]);

    let config = Config {
        owner: info.sender.clone(),
        fee_collector,
        platform_fee: msg.platform_fee,
        min_duration: msg.min_duration.unwrap_or(DEFAULT_MIN_DURATION),
        max_duration: msg.max_duration.unwrap_or(DEFAULT_MAX_DURATION),
        accepted_denoms,
        paused: false,
    };

    CONFIG.save(deps.storage, &config)?;
    LISTING_COUNT.save(deps.storage, &0u64)?;
    OFFER_COUNT.save(deps.storage, &0u64)?;
    SALE_COUNT.save(deps.storage, &0u64)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("owner", info.sender))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    // Check if paused (except for admin operations)
    let config = CONFIG.load(deps.storage)?;
    
    match &msg {
        ExecuteMsg::UpdateConfig { .. } | ExecuteMsg::SetPaused { .. } | ExecuteMsg::EmergencyWithdraw { .. } => {}
        _ => {
            if config.paused {
                return Err(ContractError::Paused {});
            }
        }
    }

    match msg {
        // Listing operations
        ExecuteMsg::ListFixedPrice {
            nft_contract,
            token_id,
            price,
            duration,
        } => execute_list_fixed_price(deps, env, info, nft_contract, token_id, price, duration),
        ExecuteMsg::ListAuction {
            nft_contract,
            token_id,
            starting_price,
            reserve_price,
            min_increment,
            duration,
        } => execute_list_auction(
            deps,
            env,
            info,
            nft_contract,
            token_id,
            starting_price,
            reserve_price,
            min_increment,
            duration,
        ),
        ExecuteMsg::ListDutchAuction {
            nft_contract,
            token_id,
            start_price,
            end_price,
            duration,
        } => execute_list_dutch_auction(
            deps,
            env,
            info,
            nft_contract,
            token_id,
            start_price,
            end_price,
            duration,
        ),
        ExecuteMsg::CancelListing {
            nft_contract,
            token_id,
        } => execute_cancel_listing(deps, env, info, nft_contract, token_id),
        ExecuteMsg::UpdatePrice {
            nft_contract,
            token_id,
            new_price,
        } => execute_update_price(deps, info, nft_contract, token_id, new_price),

        // Buying operations
        ExecuteMsg::Buy {
            nft_contract,
            token_id,
        } => execute_buy(deps, env, info, nft_contract, token_id),
        ExecuteMsg::PlaceBid {
            nft_contract,
            token_id,
        } => execute_place_bid(deps, env, info, nft_contract, token_id),
        ExecuteMsg::AcceptBid {
            nft_contract,
            token_id,
        } => execute_accept_bid(deps, env, info, nft_contract, token_id),
        ExecuteMsg::SettleAuction {
            nft_contract,
            token_id,
        } => execute_settle_auction(deps, env, info, nft_contract, token_id),

        // Offer operations
        ExecuteMsg::MakeOffer {
            nft_contract,
            token_id,
            duration,
        } => execute_make_offer(deps, env, info, nft_contract, token_id, duration),
        ExecuteMsg::CancelOffer {
            nft_contract,
            token_id,
        } => execute_cancel_offer(deps, env, info, nft_contract, token_id),
        ExecuteMsg::AcceptOffer {
            nft_contract,
            token_id,
            bidder,
        } => execute_accept_offer(deps, env, info, nft_contract, token_id, bidder),
        ExecuteMsg::MakeCollectionOffer {
            collection,
            quantity,
            duration,
        } => execute_make_collection_offer(deps, env, info, collection, quantity, duration),
        ExecuteMsg::CancelCollectionOffer { collection } => {
            execute_cancel_collection_offer(deps, info, collection)
        }
        ExecuteMsg::AcceptCollectionOffer {
            collection,
            token_id,
            bidder,
        } => execute_accept_collection_offer(deps, env, info, collection, token_id, bidder),

        // Admin operations
        ExecuteMsg::UpdateConfig {
            owner,
            fee_collector,
            platform_fee,
            min_duration,
            max_duration,
            accepted_denoms,
        } => execute_update_config(
            deps,
            info,
            owner,
            fee_collector,
            platform_fee,
            min_duration,
            max_duration,
            accepted_denoms,
        ),
        ExecuteMsg::SetPaused { paused } => execute_set_paused(deps, info, paused),
        ExecuteMsg::EmergencyWithdraw { recipient, amount } => {
            execute_emergency_withdraw(deps, info, recipient, amount)
        }
    }
}

// ============ LISTING IMPLEMENTATIONS ============

fn execute_list_fixed_price(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    price: Coin,
    duration: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    validate_duration(duration, &config)?;
    validate_price(&price, &config)?;

    // Check listing doesn't exist
    if LISTINGS.has(deps.storage, (&nft_contract_addr, &token_id)) {
        return Err(ContractError::ListingAlreadyExists {
            nft_contract,
            token_id,
        });
    }

    // Query NFT ownership
    let owner = query_nft_owner(deps.as_ref(), &nft_contract_addr, &token_id)?;
    if owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    // Query royalty info
    let (royalty_recipient, royalty_percentage) =
        query_royalty_info(deps.as_ref(), &nft_contract_addr, &token_id)?;

    // Create listing
    let listing_id = LISTING_COUNT.load(deps.storage)? + 1;
    LISTING_COUNT.save(deps.storage, &listing_id)?;

    let listing = Listing {
        id: listing_id,
        seller: info.sender.clone(),
        nft_contract: nft_contract_addr.clone(),
        token_id: token_id.clone(),
        listing_type: ListingType::FixedPrice,
        price: price.clone(),
        auction_state: None,
        created_at: env.block.time,
        expires_at: env.block.time.plus_seconds(duration),
        royalty_recipient,
        royalty_percentage,
    };

    LISTINGS.save(deps.storage, (&nft_contract_addr, &token_id), &listing)?;
    LISTINGS_BY_ID.save(deps.storage, listing_id, &(nft_contract_addr.clone(), token_id.clone()))?;
    SELLER_LISTINGS.save(deps.storage, (&info.sender, listing_id), &true)?;

    // Update collection stats
    update_collection_stats_listing(deps, &nft_contract_addr, true, Some(price.amount))?;

    Ok(Response::new()
        .add_attribute("action", "list_fixed_price")
        .add_attribute("listing_id", listing_id.to_string())
        .add_attribute("nft_contract", nft_contract)
        .add_attribute("token_id", token_id)
        .add_attribute("price", price.to_string()))
}

fn execute_list_auction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    starting_price: Coin,
    reserve_price: Option<Uint128>,
    min_increment: Option<Uint128>,
    duration: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    validate_duration(duration, &config)?;
    validate_price(&starting_price, &config)?;

    if LISTINGS.has(deps.storage, (&nft_contract_addr, &token_id)) {
        return Err(ContractError::ListingAlreadyExists {
            nft_contract,
            token_id,
        });
    }

    let owner = query_nft_owner(deps.as_ref(), &nft_contract_addr, &token_id)?;
    if owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    let (royalty_recipient, royalty_percentage) =
        query_royalty_info(deps.as_ref(), &nft_contract_addr, &token_id)?;

    let listing_id = LISTING_COUNT.load(deps.storage)? + 1;
    LISTING_COUNT.save(deps.storage, &listing_id)?;

    let auction_state = AuctionState {
        highest_bidder: None,
        highest_bid: Uint128::zero(),
        reserve_price: reserve_price.unwrap_or(starting_price.amount),
        min_increment: min_increment.unwrap_or(Uint128::from(1u128)),
    };

    let listing = Listing {
        id: listing_id,
        seller: info.sender.clone(),
        nft_contract: nft_contract_addr.clone(),
        token_id: token_id.clone(),
        listing_type: ListingType::Auction,
        price: starting_price,
        auction_state: Some(auction_state),
        created_at: env.block.time,
        expires_at: env.block.time.plus_seconds(duration),
        royalty_recipient,
        royalty_percentage,
    };

    LISTINGS.save(deps.storage, (&nft_contract_addr, &token_id), &listing)?;
    LISTINGS_BY_ID.save(deps.storage, listing_id, &(nft_contract_addr.clone(), token_id.clone()))?;
    SELLER_LISTINGS.save(deps.storage, (&info.sender, listing_id), &true)?;

    update_collection_stats_listing(deps, &nft_contract_addr, true, None)?;

    Ok(Response::new()
        .add_attribute("action", "list_auction")
        .add_attribute("listing_id", listing_id.to_string())
        .add_attribute("nft_contract", nft_contract)
        .add_attribute("token_id", token_id))
}

fn execute_list_dutch_auction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    start_price: Coin,
    end_price: Uint128,
    duration: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    validate_duration(duration, &config)?;
    validate_price(&start_price, &config)?;

    if end_price >= start_price.amount {
        return Err(ContractError::InvalidPrice {});
    }

    if LISTINGS.has(deps.storage, (&nft_contract_addr, &token_id)) {
        return Err(ContractError::ListingAlreadyExists {
            nft_contract,
            token_id,
        });
    }

    let owner = query_nft_owner(deps.as_ref(), &nft_contract_addr, &token_id)?;
    if owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    let (royalty_recipient, royalty_percentage) =
        query_royalty_info(deps.as_ref(), &nft_contract_addr, &token_id)?;

    let listing_id = LISTING_COUNT.load(deps.storage)? + 1;
    LISTING_COUNT.save(deps.storage, &listing_id)?;

    let price_diff = start_price.amount - end_price;
    let decline_rate = price_diff / Uint128::from(duration);

    let listing = Listing {
        id: listing_id,
        seller: info.sender.clone(),
        nft_contract: nft_contract_addr.clone(),
        token_id: token_id.clone(),
        listing_type: ListingType::DutchAuction {
            start_price: start_price.amount,
            end_price,
            decline_rate,
        },
        price: start_price,
        auction_state: None,
        created_at: env.block.time,
        expires_at: env.block.time.plus_seconds(duration),
        royalty_recipient,
        royalty_percentage,
    };

    LISTINGS.save(deps.storage, (&nft_contract_addr, &token_id), &listing)?;
    LISTINGS_BY_ID.save(deps.storage, listing_id, &(nft_contract_addr.clone(), token_id.clone()))?;
    SELLER_LISTINGS.save(deps.storage, (&info.sender, listing_id), &true)?;

    update_collection_stats_listing(deps, &nft_contract_addr, true, None)?;

    Ok(Response::new()
        .add_attribute("action", "list_dutch_auction")
        .add_attribute("listing_id", listing_id.to_string())
        .add_attribute("nft_contract", nft_contract)
        .add_attribute("token_id", token_id))
}

fn execute_cancel_listing(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    // Only seller or admin can cancel
    let config = CONFIG.load(deps.storage)?;
    if info.sender != listing.seller && info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    let mut messages: Vec<CosmosMsg> = vec![];

    // Refund highest bidder if auction
    if let Some(auction) = &listing.auction_state {
        if let Some(bidder) = &auction.highest_bidder {
            if !auction.highest_bid.is_zero() {
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: bidder.to_string(),
                    amount: vec![Coin {
                        denom: listing.price.denom.clone(),
                        amount: auction.highest_bid,
                    }],
                }));
            }
        }
    }

    // Remove listing
    LISTINGS.remove(deps.storage, (&nft_contract_addr, &token_id));
    LISTINGS_BY_ID.remove(deps.storage, listing.id);
    SELLER_LISTINGS.remove(deps.storage, (&listing.seller, listing.id));

    update_collection_stats_listing(deps, &nft_contract_addr, false, None)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "cancel_listing")
        .add_attribute("listing_id", listing.id.to_string()))
}

fn execute_update_price(
    deps: DepsMut,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    new_price: Coin,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    validate_price(&new_price, &config)?;

    let mut listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    if info.sender != listing.seller {
        return Err(ContractError::Unauthorized {});
    }

    // Can only update fixed price listings
    if !matches!(listing.listing_type, ListingType::FixedPrice) {
        return Err(ContractError::Unauthorized {});
    }

    listing.price = new_price.clone();
    LISTINGS.save(deps.storage, (&nft_contract_addr, &token_id), &listing)?;

    Ok(Response::new()
        .add_attribute("action", "update_price")
        .add_attribute("listing_id", listing.id.to_string())
        .add_attribute("new_price", new_price.to_string()))
}

// ============ BUYING IMPLEMENTATIONS ============

fn execute_buy(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    // Check not buying own listing
    if info.sender == listing.seller {
        return Err(ContractError::CannotBuyOwnListing {});
    }

    // Check not expired
    if env.block.time > listing.expires_at {
        return Err(ContractError::ListingExpired {});
    }

    // Calculate price based on listing type
    let price = match &listing.listing_type {
        ListingType::FixedPrice => listing.price.amount,
        ListingType::DutchAuction {
            start_price,
            end_price,
            decline_rate,
        } => {
            let elapsed = env.block.time.seconds() - listing.created_at.seconds();
            let decrease = decline_rate.checked_mul(Uint128::from(elapsed)).unwrap_or(*start_price);
            std::cmp::max(*end_price, start_price.saturating_sub(decrease))
        }
        ListingType::Auction => {
            return Err(ContractError::Unauthorized {}); // Use PlaceBid for auctions
        }
    };

    // Verify payment
    let payment = info
        .funds
        .iter()
        .find(|c| c.denom == listing.price.denom)
        .map(|c| c.amount)
        .unwrap_or_default();

    if payment < price {
        return Err(ContractError::InsufficientFunds {
            required: price.u128(),
            sent: payment.u128(),
        });
    }

    // Execute sale
    let messages = execute_sale(
        deps,
        &env,
        &config,
        &listing,
        info.sender.clone(),
        Coin {
            denom: listing.price.denom.clone(),
            amount: price,
        },
    )?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "buy")
        .add_attribute("listing_id", listing.id.to_string())
        .add_attribute("buyer", info.sender)
        .add_attribute("price", price.to_string()))
}

fn execute_place_bid(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let mut listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    // Must be an auction
    let auction = listing
        .auction_state
        .as_mut()
        .ok_or(ContractError::Unauthorized {})?;

    // Check not bidding on own auction
    if info.sender == listing.seller {
        return Err(ContractError::CannotBidOnOwnAuction {});
    }

    // Check not expired
    if env.block.time > listing.expires_at {
        return Err(ContractError::AuctionEnded {});
    }

    // Get bid amount
    let bid = info
        .funds
        .iter()
        .find(|c| c.denom == listing.price.denom)
        .ok_or(ContractError::WrongDenom {
            expected: listing.price.denom.clone(),
            got: info.funds.first().map(|c| c.denom.clone()).unwrap_or_default(),
        })?;

    // Check bid is high enough
    let min_bid = if auction.highest_bid.is_zero() {
        listing.price.amount
    } else {
        auction.highest_bid + auction.min_increment
    };

    if bid.amount < min_bid {
        return Err(ContractError::BidTooLow {
            current: min_bid.u128(),
        });
    }

    let mut messages: Vec<CosmosMsg> = vec![];

    // Refund previous highest bidder
    if let Some(prev_bidder) = &auction.highest_bidder {
        if !auction.highest_bid.is_zero() {
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: prev_bidder.to_string(),
                amount: vec![Coin {
                    denom: listing.price.denom.clone(),
                    amount: auction.highest_bid,
                }],
            }));
        }
    }

    // Update auction state
    auction.highest_bidder = Some(info.sender.clone());
    auction.highest_bid = bid.amount;

    LISTINGS.save(deps.storage, (&nft_contract_addr, &token_id), &listing)?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "place_bid")
        .add_attribute("listing_id", listing.id.to_string())
        .add_attribute("bidder", info.sender)
        .add_attribute("bid", bid.to_string()))
}

fn execute_accept_bid(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    if info.sender != listing.seller {
        return Err(ContractError::Unauthorized {});
    }

    let auction = listing
        .auction_state
        .as_ref()
        .ok_or(ContractError::Unauthorized {})?;

    let bidder = auction
        .highest_bidder
        .as_ref()
        .ok_or(ContractError::OfferNotFound {})?;

    let messages = execute_sale(
        deps,
        &env,
        &config,
        &listing,
        bidder.clone(),
        Coin {
            denom: listing.price.denom.clone(),
            amount: auction.highest_bid,
        },
    )?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "accept_bid")
        .add_attribute("listing_id", listing.id.to_string())
        .add_attribute("buyer", bidder)
        .add_attribute("price", auction.highest_bid.to_string()))
}

fn execute_settle_auction(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let listing = LISTINGS
        .load(deps.storage, (&nft_contract_addr, &token_id))
        .map_err(|_| ContractError::ListingNotFound {
            nft_contract: nft_contract.clone(),
            token_id: token_id.clone(),
        })?;

    // Check auction has ended
    if env.block.time <= listing.expires_at {
        return Err(ContractError::AuctionNotEnded {});
    }

    let auction = listing
        .auction_state
        .as_ref()
        .ok_or(ContractError::Unauthorized {})?;

    // Check reserve price was met
    if auction.highest_bid < auction.reserve_price {
        // Reserve not met - refund bidder and cancel listing
        let mut messages: Vec<CosmosMsg> = vec![];
        
        if let Some(bidder) = &auction.highest_bidder {
            if !auction.highest_bid.is_zero() {
                messages.push(CosmosMsg::Bank(BankMsg::Send {
                    to_address: bidder.to_string(),
                    amount: vec![Coin {
                        denom: listing.price.denom.clone(),
                        amount: auction.highest_bid,
                    }],
                }));
            }
        }

        LISTINGS.remove(deps.storage, (&nft_contract_addr, &token_id));
        LISTINGS_BY_ID.remove(deps.storage, listing.id);
        SELLER_LISTINGS.remove(deps.storage, (&listing.seller, listing.id));

        return Ok(Response::new()
            .add_messages(messages)
            .add_attribute("action", "settle_auction")
            .add_attribute("result", "reserve_not_met"));
    }

    let bidder = auction
        .highest_bidder
        .as_ref()
        .ok_or(ContractError::OfferNotFound {})?;

    let messages = execute_sale(
        deps,
        &env,
        &config,
        &listing,
        bidder.clone(),
        Coin {
            denom: listing.price.denom.clone(),
            amount: auction.highest_bid,
        },
    )?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "settle_auction")
        .add_attribute("listing_id", listing.id.to_string())
        .add_attribute("buyer", bidder)
        .add_attribute("price", auction.highest_bid.to_string()))
}

// ============ OFFER IMPLEMENTATIONS ============

fn execute_make_offer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    duration: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    validate_duration(duration, &config)?;

    let payment = info
        .funds
        .first()
        .ok_or(ContractError::InsufficientFunds {
            required: 1,
            sent: 0,
        })?;

    if !config.accepted_denoms.contains(&payment.denom) {
        return Err(ContractError::WrongDenom {
            expected: config.accepted_denoms.join(", "),
            got: payment.denom.clone(),
        });
    }

    if payment.amount.is_zero() {
        return Err(ContractError::InvalidPrice {});
    }

    // Cancel existing offer if any
    if let Ok(existing) = OFFERS.load(deps.storage, (&nft_contract_addr, &token_id, &info.sender)) {
        // Refund existing offer
        let refund_msg = CosmosMsg::Bank(BankMsg::Send {
            to_address: info.sender.to_string(),
            amount: vec![existing.amount],
        });
        // We'll handle this in the response
    }

    let offer_id = OFFER_COUNT.load(deps.storage)? + 1;
    OFFER_COUNT.save(deps.storage, &offer_id)?;

    let offer = Offer {
        id: offer_id,
        bidder: info.sender.clone(),
        nft_contract: nft_contract_addr.clone(),
        token_id: token_id.clone(),
        amount: payment.clone(),
        created_at: env.block.time,
        expires_at: env.block.time.plus_seconds(duration),
    };

    OFFERS.save(
        deps.storage,
        (&nft_contract_addr, &token_id, &info.sender),
        &offer,
    )?;
    OFFERS_BY_ID.save(
        deps.storage,
        offer_id,
        &(nft_contract_addr, token_id.clone(), info.sender.clone()),
    )?;

    Ok(Response::new()
        .add_attribute("action", "make_offer")
        .add_attribute("offer_id", offer_id.to_string())
        .add_attribute("token_id", token_id)
        .add_attribute("amount", payment.to_string()))
}

fn execute_cancel_offer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;

    let offer = OFFERS
        .load(deps.storage, (&nft_contract_addr, &token_id, &info.sender))
        .map_err(|_| ContractError::OfferNotFound {})?;

    // Remove offer
    OFFERS.remove(deps.storage, (&nft_contract_addr, &token_id, &info.sender));
    OFFERS_BY_ID.remove(deps.storage, offer.id);

    // Refund
    let refund_msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: info.sender.to_string(),
        amount: vec![offer.amount],
    });

    Ok(Response::new()
        .add_message(refund_msg)
        .add_attribute("action", "cancel_offer")
        .add_attribute("offer_id", offer.id.to_string()))
}

fn execute_accept_offer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    nft_contract: String,
    token_id: String,
    bidder: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;
    let bidder_addr = deps.api.addr_validate(&bidder)?;

    // Verify caller owns the NFT
    let owner = query_nft_owner(deps.as_ref(), &nft_contract_addr, &token_id)?;
    if owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    let offer = OFFERS
        .load(deps.storage, (&nft_contract_addr, &token_id, &bidder_addr))
        .map_err(|_| ContractError::OfferNotFound {})?;

    // Check not expired
    if env.block.time > offer.expires_at {
        return Err(ContractError::OfferExpired {});
    }

    // Get royalty info
    let (royalty_recipient, royalty_percentage) =
        query_royalty_info(deps.as_ref(), &nft_contract_addr, &token_id)?;

    // Calculate fees
    let sale_price = offer.amount.amount;
    let platform_fee_amount = sale_price * config.platform_fee;
    let royalty_amount = royalty_percentage
        .map(|p| sale_price * p)
        .unwrap_or_default();
    let seller_amount = sale_price - platform_fee_amount - royalty_amount;

    let mut messages: Vec<CosmosMsg> = vec![];

    // Transfer NFT to buyer
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: nft_contract_addr.to_string(),
        msg: to_json_binary(&Cw721ExecuteMsg::TransferNft {
            recipient: bidder_addr.to_string(),
            token_id: token_id.clone(),
        })?,
        funds: vec![],
    }));

    // Pay seller
    if !seller_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: info.sender.to_string(),
            amount: vec![Coin {
                denom: offer.amount.denom.clone(),
                amount: seller_amount,
            }],
        }));
    }

    // Pay platform fee
    if !platform_fee_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: config.fee_collector.to_string(),
            amount: vec![Coin {
                denom: offer.amount.denom.clone(),
                amount: platform_fee_amount,
            }],
        }));
    }

    // Pay royalty
    if let Some(recipient) = royalty_recipient {
        if !royalty_amount.is_zero() {
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: recipient.to_string(),
                amount: vec![Coin {
                    denom: offer.amount.denom.clone(),
                    amount: royalty_amount,
                }],
            }));
        }
    }

    // Remove offer
    OFFERS.remove(deps.storage, (&nft_contract_addr, &token_id, &bidder_addr));
    OFFERS_BY_ID.remove(deps.storage, offer.id);

    // Cancel listing if exists
    if LISTINGS.has(deps.storage, (&nft_contract_addr, &token_id)) {
        let listing = LISTINGS.load(deps.storage, (&nft_contract_addr, &token_id))?;
        LISTINGS.remove(deps.storage, (&nft_contract_addr, &token_id));
        LISTINGS_BY_ID.remove(deps.storage, listing.id);
        SELLER_LISTINGS.remove(deps.storage, (&listing.seller, listing.id));
    }

    // Record sale
    record_sale(
        deps,
        &nft_contract_addr,
        &token_id,
        &info.sender,
        &bidder_addr,
        &offer.amount,
        platform_fee_amount,
        royalty_amount,
        &env,
    )?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "accept_offer")
        .add_attribute("offer_id", offer.id.to_string())
        .add_attribute("seller", info.sender)
        .add_attribute("buyer", bidder)
        .add_attribute("price", sale_price.to_string()))
}

fn execute_make_collection_offer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    collection: String,
    quantity: u32,
    duration: u64,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let collection_addr = deps.api.addr_validate(&collection)?;

    validate_duration(duration, &config)?;

    let payment = info
        .funds
        .first()
        .ok_or(ContractError::InsufficientFunds {
            required: 1,
            sent: 0,
        })?;

    if !config.accepted_denoms.contains(&payment.denom) {
        return Err(ContractError::WrongDenom {
            expected: config.accepted_denoms.join(", "),
            got: payment.denom.clone(),
        });
    }

    let price_per_nft = payment.amount / Uint128::from(quantity);
    if price_per_nft.is_zero() {
        return Err(ContractError::InvalidPrice {});
    }

    let offer_id = OFFER_COUNT.load(deps.storage)? + 1;
    OFFER_COUNT.save(deps.storage, &offer_id)?;

    let offer = crate::state::CollectionOffer {
        id: offer_id,
        bidder: info.sender.clone(),
        collection: collection_addr.clone(),
        amount: Coin {
            denom: payment.denom.clone(),
            amount: price_per_nft,
        },
        quantity,
        filled: 0,
        created_at: env.block.time,
        expires_at: env.block.time.plus_seconds(duration),
    };

    COLLECTION_OFFERS.save(deps.storage, (&collection_addr, &info.sender), &offer)?;

    Ok(Response::new()
        .add_attribute("action", "make_collection_offer")
        .add_attribute("offer_id", offer_id.to_string())
        .add_attribute("collection", collection)
        .add_attribute("quantity", quantity.to_string())
        .add_attribute("price_per_nft", price_per_nft.to_string()))
}

fn execute_cancel_collection_offer(
    deps: DepsMut,
    info: MessageInfo,
    collection: String,
) -> Result<Response, ContractError> {
    let collection_addr = deps.api.addr_validate(&collection)?;

    let offer = COLLECTION_OFFERS
        .load(deps.storage, (&collection_addr, &info.sender))
        .map_err(|_| ContractError::OfferNotFound {})?;

    // Calculate refund (unfilled portion)
    let unfilled = offer.quantity - offer.filled;
    let refund_amount = offer.amount.amount * Uint128::from(unfilled);

    COLLECTION_OFFERS.remove(deps.storage, (&collection_addr, &info.sender));

    let mut messages: Vec<CosmosMsg> = vec![];
    if !refund_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: info.sender.to_string(),
            amount: vec![Coin {
                denom: offer.amount.denom,
                amount: refund_amount,
            }],
        }));
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "cancel_collection_offer")
        .add_attribute("offer_id", offer.id.to_string()))
}

fn execute_accept_collection_offer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    collection: String,
    token_id: String,
    bidder: String,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let collection_addr = deps.api.addr_validate(&collection)?;
    let bidder_addr = deps.api.addr_validate(&bidder)?;

    // Verify caller owns the NFT
    let owner = query_nft_owner(deps.as_ref(), &collection_addr, &token_id)?;
    if owner != info.sender {
        return Err(ContractError::Unauthorized {});
    }

    let mut offer = COLLECTION_OFFERS
        .load(deps.storage, (&collection_addr, &bidder_addr))
        .map_err(|_| ContractError::OfferNotFound {})?;

    // Check not expired
    if env.block.time > offer.expires_at {
        return Err(ContractError::OfferExpired {});
    }

    // Check not fully filled
    if offer.filled >= offer.quantity {
        return Err(ContractError::OfferNotFound {});
    }

    // Get royalty info
    let (royalty_recipient, royalty_percentage) =
        query_royalty_info(deps.as_ref(), &collection_addr, &token_id)?;

    // Calculate fees
    let sale_price = offer.amount.amount;
    let platform_fee_amount = sale_price * config.platform_fee;
    let royalty_amount = royalty_percentage
        .map(|p| sale_price * p)
        .unwrap_or_default();
    let seller_amount = sale_price - platform_fee_amount - royalty_amount;

    let mut messages: Vec<CosmosMsg> = vec![];

    // Transfer NFT to buyer
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: collection_addr.to_string(),
        msg: to_json_binary(&Cw721ExecuteMsg::TransferNft {
            recipient: bidder_addr.to_string(),
            token_id: token_id.clone(),
        })?,
        funds: vec![],
    }));

    // Pay seller
    if !seller_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: info.sender.to_string(),
            amount: vec![Coin {
                denom: offer.amount.denom.clone(),
                amount: seller_amount,
            }],
        }));
    }

    // Pay platform fee
    if !platform_fee_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: config.fee_collector.to_string(),
            amount: vec![Coin {
                denom: offer.amount.denom.clone(),
                amount: platform_fee_amount,
            }],
        }));
    }

    // Pay royalty
    if let Some(recipient) = royalty_recipient {
        if !royalty_amount.is_zero() {
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: recipient.to_string(),
                amount: vec![Coin {
                    denom: offer.amount.denom.clone(),
                    amount: royalty_amount,
                }],
            }));
        }
    }

    // Update offer
    offer.filled += 1;
    if offer.filled >= offer.quantity {
        COLLECTION_OFFERS.remove(deps.storage, (&collection_addr, &bidder_addr));
    } else {
        COLLECTION_OFFERS.save(deps.storage, (&collection_addr, &bidder_addr), &offer)?;
    }

    // Record sale
    record_sale(
        deps,
        &collection_addr,
        &token_id,
        &info.sender,
        &bidder_addr,
        &offer.amount,
        platform_fee_amount,
        royalty_amount,
        &env,
    )?;

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "accept_collection_offer")
        .add_attribute("offer_id", offer.id.to_string())
        .add_attribute("seller", info.sender)
        .add_attribute("buyer", bidder)
        .add_attribute("price", sale_price.to_string()))
}

// ============ ADMIN IMPLEMENTATIONS ============

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    owner: Option<String>,
    fee_collector: Option<String>,
    platform_fee: Option<Decimal>,
    min_duration: Option<u64>,
    max_duration: Option<u64>,
    accepted_denoms: Option<Vec<String>>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(o) = owner {
        config.owner = deps.api.addr_validate(&o)?;
    }

    if let Some(f) = fee_collector {
        config.fee_collector = deps.api.addr_validate(&f)?;
    }

    if let Some(fee) = platform_fee {
        if fee > Decimal::percent(100) {
            return Err(ContractError::InvalidFeePercentage {});
        }
        config.platform_fee = fee;
    }

    if let Some(min) = min_duration {
        config.min_duration = min;
    }

    if let Some(max) = max_duration {
        config.max_duration = max;
    }

    if let Some(denoms) = accepted_denoms {
        config.accepted_denoms = denoms;
    }

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("action", "update_config"))
}

fn execute_set_paused(
    deps: DepsMut,
    info: MessageInfo,
    paused: bool,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    config.paused = paused;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "set_paused")
        .add_attribute("paused", paused.to_string()))
}

fn execute_emergency_withdraw(
    deps: DepsMut,
    info: MessageInfo,
    recipient: String,
    amount: Coin,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    let recipient_addr = deps.api.addr_validate(&recipient)?;

    let msg = CosmosMsg::Bank(BankMsg::Send {
        to_address: recipient_addr.to_string(),
        amount: vec![amount.clone()],
    });

    Ok(Response::new()
        .add_message(msg)
        .add_attribute("action", "emergency_withdraw")
        .add_attribute("recipient", recipient)
        .add_attribute("amount", amount.to_string()))
}

// ============ HELPER FUNCTIONS ============

fn validate_duration(duration: u64, config: &Config) -> Result<(), ContractError> {
    if duration < config.min_duration || duration > config.max_duration {
        return Err(ContractError::InvalidDuration {
            min: config.min_duration,
            max: config.max_duration,
        });
    }
    Ok(())
}

fn validate_price(price: &Coin, config: &Config) -> Result<(), ContractError> {
    if price.amount.is_zero() {
        return Err(ContractError::InvalidPrice {});
    }
    if !config.accepted_denoms.contains(&price.denom) {
        return Err(ContractError::WrongDenom {
            expected: config.accepted_denoms.join(", "),
            got: price.denom.clone(),
        });
    }
    Ok(())
}

fn query_nft_owner(deps: Deps, contract: &Addr, token_id: &str) -> Result<Addr, ContractError> {
    let query_msg = cw721::Cw721QueryMsg::OwnerOf {
        token_id: token_id.to_string(),
        include_expired: Some(false),
    };
    let response: cw721::OwnerOfResponse = deps.querier.query_wasm_smart(contract, &query_msg)?;
    Ok(deps.api.addr_validate(&response.owner)?)
}

fn query_royalty_info(
    deps: Deps,
    contract: &Addr,
    token_id: &str,
) -> Result<(Option<Addr>, Option<Decimal>), ContractError> {
    // Try to query royalty info - not all contracts support this
    // This is a simplified version; real implementation would query the actual contract
    Ok((None, None))
}

fn execute_sale(
    deps: DepsMut,
    env: &Env,
    config: &Config,
    listing: &Listing,
    buyer: Addr,
    price: Coin,
) -> Result<Vec<CosmosMsg>, ContractError> {
    let sale_price = price.amount;
    let platform_fee_amount = sale_price * config.platform_fee;
    let royalty_amount = listing
        .royalty_percentage
        .map(|p| sale_price * p)
        .unwrap_or_default();
    let seller_amount = sale_price - platform_fee_amount - royalty_amount;

    let mut messages: Vec<CosmosMsg> = vec![];

    // Transfer NFT to buyer
    messages.push(CosmosMsg::Wasm(WasmMsg::Execute {
        contract_addr: listing.nft_contract.to_string(),
        msg: to_json_binary(&Cw721ExecuteMsg::TransferNft {
            recipient: buyer.to_string(),
            token_id: listing.token_id.clone(),
        })?,
        funds: vec![],
    }));

    // Pay seller
    if !seller_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: listing.seller.to_string(),
            amount: vec![Coin {
                denom: price.denom.clone(),
                amount: seller_amount,
            }],
        }));
    }

    // Pay platform fee
    if !platform_fee_amount.is_zero() {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: config.fee_collector.to_string(),
            amount: vec![Coin {
                denom: price.denom.clone(),
                amount: platform_fee_amount,
            }],
        }));
    }

    // Pay royalty
    if let Some(recipient) = &listing.royalty_recipient {
        if !royalty_amount.is_zero() {
            messages.push(CosmosMsg::Bank(BankMsg::Send {
                to_address: recipient.to_string(),
                amount: vec![Coin {
                    denom: price.denom.clone(),
                    amount: royalty_amount,
                }],
            }));
        }
    }

    // Remove listing
    LISTINGS.remove(deps.storage, (&listing.nft_contract, &listing.token_id));
    LISTINGS_BY_ID.remove(deps.storage, listing.id);
    SELLER_LISTINGS.remove(deps.storage, (&listing.seller, listing.id));

    // Record sale
    record_sale(
        deps,
        &listing.nft_contract,
        &listing.token_id,
        &listing.seller,
        &buyer,
        &price,
        platform_fee_amount,
        royalty_amount,
        env,
    )?;

    Ok(messages)
}

fn record_sale(
    deps: DepsMut,
    nft_contract: &Addr,
    token_id: &str,
    seller: &Addr,
    buyer: &Addr,
    price: &Coin,
    platform_fee: Uint128,
    royalty_fee: Uint128,
    env: &Env,
) -> Result<(), ContractError> {
    let sale_id = SALE_COUNT.load(deps.storage)? + 1;
    SALE_COUNT.save(deps.storage, &sale_id)?;

    let sale = Sale {
        nft_contract: nft_contract.clone(),
        token_id: token_id.to_string(),
        seller: seller.clone(),
        buyer: buyer.clone(),
        price: price.clone(),
        platform_fee,
        royalty_fee,
        timestamp: env.block.time,
    };

    SALES.save(deps.storage, sale_id, &sale)?;

    // Update collection stats
    let mut stats = COLLECTION_STATS
        .load(deps.storage, nft_contract)
        .unwrap_or(CollectionStats {
            total_volume: Uint128::zero(),
            floor_price: None,
            total_sales: 0,
            total_listings: 0,
        });

    stats.total_volume += price.amount;
    stats.total_sales += 1;
    stats.total_listings = stats.total_listings.saturating_sub(1);

    COLLECTION_STATS.save(deps.storage, nft_contract, &stats)?;

    Ok(())
}

fn update_collection_stats_listing(
    deps: DepsMut,
    collection: &Addr,
    is_new: bool,
    price: Option<Uint128>,
) -> Result<(), ContractError> {
    let mut stats = COLLECTION_STATS
        .load(deps.storage, collection)
        .unwrap_or(CollectionStats {
            total_volume: Uint128::zero(),
            floor_price: None,
            total_sales: 0,
            total_listings: 0,
        });

    if is_new {
        stats.total_listings += 1;
        // Update floor price if this is lower
        if let Some(p) = price {
            stats.floor_price = Some(
                stats
                    .floor_price
                    .map(|f| std::cmp::min(f, p))
                    .unwrap_or(p),
            );
        }
    } else {
        stats.total_listings = stats.total_listings.saturating_sub(1);
        // Note: Recalculating floor price would require iterating all listings
        // In production, you'd use an index or recalculate periodically
    }

    COLLECTION_STATS.save(deps.storage, collection, &stats)?;
    Ok(())
}

// ============ QUERY IMPLEMENTATIONS ============

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Listing {
            nft_contract,
            token_id,
        } => to_json_binary(&query_listing(deps, nft_contract, token_id)?),
        QueryMsg::ListingById { listing_id } => {
            to_json_binary(&query_listing_by_id(deps, listing_id)?)
        }
        QueryMsg::Listings {
            collection,
            seller,
            listing_type,
            min_price,
            max_price,
            active_only,
            start_after,
            limit,
        } => to_json_binary(&query_listings(
            deps,
            env,
            collection,
            seller,
            listing_type,
            min_price,
            max_price,
            active_only,
            start_after,
            limit,
        )?),
        QueryMsg::Offers {
            nft_contract,
            token_id,
            start_after,
            limit,
        } => to_json_binary(&query_offers(deps, nft_contract, token_id, start_after, limit)?),
        QueryMsg::UserOffers {
            user,
            start_after,
            limit,
        } => to_json_binary(&query_user_offers(deps, user, start_after, limit)?),
        QueryMsg::Offer {
            nft_contract,
            token_id,
            bidder,
        } => to_json_binary(&query_offer(deps, nft_contract, token_id, bidder)?),
        QueryMsg::CollectionOffers {
            collection,
            start_after,
            limit,
        } => to_json_binary(&query_collection_offers(deps, collection, start_after, limit)?),
        QueryMsg::CollectionStats { collection } => {
            to_json_binary(&query_collection_stats(deps, collection)?)
        }
        QueryMsg::Sales {
            collection,
            start_after,
            limit,
        } => to_json_binary(&query_sales(deps, collection, start_after, limit)?),
        QueryMsg::Escrow { user } => to_json_binary(&query_escrow(deps, user)?),
        QueryMsg::DutchPrice {
            nft_contract,
            token_id,
        } => to_json_binary(&query_dutch_price(deps, env, nft_contract, token_id)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        owner: config.owner.to_string(),
        fee_collector: config.fee_collector.to_string(),
        platform_fee: config.platform_fee,
        min_duration: config.min_duration,
        max_duration: config.max_duration,
        accepted_denoms: config.accepted_denoms,
        paused: config.paused,
    })
}

fn query_listing(deps: Deps, nft_contract: String, token_id: String) -> StdResult<ListingResponse> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;
    let listing = LISTINGS.may_load(deps.storage, (&nft_contract_addr, &token_id))?;
    Ok(ListingResponse { listing })
}

fn query_listing_by_id(deps: Deps, listing_id: u64) -> StdResult<ListingResponse> {
    let key = LISTINGS_BY_ID.may_load(deps.storage, listing_id)?;
    let listing = match key {
        Some((contract, token_id)) => LISTINGS.may_load(deps.storage, (&contract, &token_id))?,
        None => None,
    };
    Ok(ListingResponse { listing })
}

fn query_listings(
    deps: Deps,
    env: Env,
    collection: Option<String>,
    seller: Option<String>,
    listing_type: Option<String>,
    min_price: Option<Uint128>,
    max_price: Option<Uint128>,
    active_only: Option<bool>,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<ListingsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let active_only = active_only.unwrap_or(true);

    let listings: Vec<Listing> = LISTINGS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| item.ok())
        .map(|(_, listing)| listing)
        .filter(|l| {
            // Filter by start_after
            if let Some(after) = start_after {
                if l.id <= after {
                    return false;
                }
            }
            // Filter by collection
            if let Some(ref c) = collection {
                if l.nft_contract.to_string() != *c {
                    return false;
                }
            }
            // Filter by seller
            if let Some(ref s) = seller {
                if l.seller.to_string() != *s {
                    return false;
                }
            }
            // Filter by active
            if active_only && env.block.time > l.expires_at {
                return false;
            }
            // Filter by price range
            if let Some(min) = min_price {
                if l.price.amount < min {
                    return false;
                }
            }
            if let Some(max) = max_price {
                if l.price.amount > max {
                    return false;
                }
            }
            true
        })
        .take(limit)
        .collect();

    Ok(ListingsResponse { listings })
}

fn query_offers(
    deps: Deps,
    nft_contract: String,
    token_id: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<OffersResponse> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let offers: Vec<Offer> = OFFERS
        .prefix((&nft_contract_addr, &token_id))
        .range(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| item.ok())
        .map(|(_, offer)| offer)
        .collect();

    Ok(OffersResponse { offers })
}

fn query_user_offers(
    deps: Deps,
    user: String,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<OffersResponse> {
    let user_addr = deps.api.addr_validate(&user)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    // This is inefficient - in production you'd have a separate index
    let offers: Vec<Offer> = OFFERS
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| item.ok())
        .map(|(_, offer)| offer)
        .filter(|o| {
            o.bidder == user_addr
                && start_after.map(|a| o.id > a).unwrap_or(true)
        })
        .take(limit)
        .collect();

    Ok(OffersResponse { offers })
}

fn query_offer(
    deps: Deps,
    nft_contract: String,
    token_id: String,
    bidder: String,
) -> StdResult<OfferResponse> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;
    let bidder_addr = deps.api.addr_validate(&bidder)?;

    let offer = OFFERS.may_load(deps.storage, (&nft_contract_addr, &token_id, &bidder_addr))?;
    Ok(OfferResponse { offer })
}

fn query_collection_offers(
    deps: Deps,
    collection: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<CollectionOffersResponse> {
    let collection_addr = deps.api.addr_validate(&collection)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let offers: Vec<crate::state::CollectionOffer> = COLLECTION_OFFERS
        .prefix(&collection_addr)
        .range(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| item.ok())
        .map(|(_, offer)| offer)
        .collect();

    Ok(CollectionOffersResponse { offers })
}

fn query_collection_stats(deps: Deps, collection: String) -> StdResult<CollectionStatsResponse> {
    let collection_addr = deps.api.addr_validate(&collection)?;
    let stats = COLLECTION_STATS.may_load(deps.storage, &collection_addr)?;
    Ok(CollectionStatsResponse { stats })
}

fn query_sales(
    deps: Deps,
    collection: Option<String>,
    start_after: Option<u64>,
    limit: Option<u32>,
) -> StdResult<SalesResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let collection_addr = collection
        .map(|c| deps.api.addr_validate(&c))
        .transpose()?;

    let start = start_after.map(cosmwasm_std::Bound::exclusive);

    let sales: Vec<Sale> = SALES
        .range(deps.storage, start, None, Order::Descending)
        .take(limit)
        .filter_map(|item| item.ok())
        .map(|(_, sale)| sale)
        .filter(|s| {
            collection_addr
                .as_ref()
                .map(|c| s.nft_contract == *c)
                .unwrap_or(true)
        })
        .collect();

    Ok(SalesResponse { sales })
}

fn query_escrow(deps: Deps, user: String) -> StdResult<EscrowResponse> {
    let user_addr = deps.api.addr_validate(&user)?;

    // Aggregate all escrowed funds for user
    let funds: Vec<Coin> = ESCROW
        .prefix(&user_addr)
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| item.ok())
        .map(|(_, coin)| coin)
        .collect();

    Ok(EscrowResponse { total: funds })
}

fn query_dutch_price(
    deps: Deps,
    env: Env,
    nft_contract: String,
    token_id: String,
) -> StdResult<DutchPriceResponse> {
    let nft_contract_addr = deps.api.addr_validate(&nft_contract)?;
    let listing = LISTINGS.load(deps.storage, (&nft_contract_addr, &token_id))?;

    let (current_price, denom) = match &listing.listing_type {
        ListingType::DutchAuction {
            start_price,
            end_price,
            decline_rate,
        } => {
            let elapsed = env.block.time.seconds() - listing.created_at.seconds();
            let decrease = decline_rate
                .checked_mul(Uint128::from(elapsed))
                .unwrap_or(*start_price);
            let price = std::cmp::max(*end_price, start_price.saturating_sub(decrease));
            (price, listing.price.denom.clone())
        }
        _ => (listing.price.amount, listing.price.denom.clone()),
    };

    Ok(DutchPriceResponse {
        current_price,
        denom,
    })
}
