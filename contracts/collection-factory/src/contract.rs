use cosmwasm_std::{
    entry_point, to_json_binary, Addr, BankMsg, Binary, Coin, CosmosMsg, Decimal, Deps, DepsMut,
    Env, MessageInfo, Order, Reply, Response, StdResult, SubMsg, WasmMsg,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{
    CollectionResponse, CollectionsResponse, ConfigResponse, CountResponse, Cw721InstantiateMsg,
    ExecuteMsg, InstantiateMsg, NameAvailableResponse, QueryMsg, RoyaltyInfoMsg,
};
use crate::state::{
    Collection, CollectionStatus, Config, PendingCollection, Socials, COLLECTIONS,
    COLLECTION_BY_NAME, COLLECTION_COUNT, CONFIG, CREATOR_COLLECTIONS, PENDING_COLLECTION,
    VERIFIED_COLLECTIONS,
};

const CONTRACT_NAME: &str = "crates.io:nibiru-collection-factory";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

const INSTANTIATE_REPLY_ID: u64 = 1;
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

    let fee_collector = msg
        .fee_collector
        .map(|f| deps.api.addr_validate(&f))
        .transpose()?
        .unwrap_or_else(|| info.sender.clone());

    let max_royalty = msg
        .max_royalty_percentage
        .unwrap_or(Decimal::percent(10));

    if max_royalty > Decimal::percent(100) {
        return Err(ContractError::InvalidRoyaltyPercentage {});
    }

    let config = Config {
        owner: info.sender.clone(),
        cw721_code_id: msg.cw721_code_id,
        creation_fee: msg.creation_fee,
        fee_collector,
        paused: false,
        max_royalty_percentage: max_royalty,
    };

    CONFIG.save(deps.storage, &config)?;
    COLLECTION_COUNT.save(deps.storage, &0u64)?;

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("owner", info.sender)
        .add_attribute("cw721_code_id", msg.cw721_code_id.to_string()))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Check if paused (except admin operations)
    match &msg {
        ExecuteMsg::UpdateConfig { .. }
        | ExecuteMsg::SetPaused { .. }
        | ExecuteMsg::WithdrawFees { .. } => {}
        _ => {
            if config.paused {
                return Err(ContractError::Paused {});
            }
        }
    }

    match msg {
        ExecuteMsg::CreateCollection {
            name,
            symbol,
            description,
            image,
            banner,
            external_url,
            royalty_percentage,
            royalty_recipient,
            socials,
            categories,
            max_supply,
        } => execute_create_collection(
            deps,
            env,
            info,
            name,
            symbol,
            description,
            image,
            banner,
            external_url,
            royalty_percentage,
            royalty_recipient,
            socials,
            categories,
            max_supply,
        ),
        ExecuteMsg::UpdateCollection {
            collection,
            description,
            image,
            banner,
            external_url,
            socials,
            categories,
        } => execute_update_collection(
            deps,
            info,
            collection,
            description,
            image,
            banner,
            external_url,
            socials,
            categories,
        ),
        ExecuteMsg::UpdateRoyalty {
            collection,
            royalty_percentage,
            royalty_recipient,
        } => execute_update_royalty(deps, info, collection, royalty_percentage, royalty_recipient),
        ExecuteMsg::VerifyCollection { collection } => {
            execute_set_status(deps, info, collection, CollectionStatus::Verified)
        }
        ExecuteMsg::UnverifyCollection { collection } => {
            execute_set_status(deps, info, collection, CollectionStatus::Unverified)
        }
        ExecuteMsg::FlagCollection { collection, reason: _ } => {
            execute_set_status(deps, info, collection, CollectionStatus::Flagged)
        }
        ExecuteMsg::BanCollection { collection, reason: _ } => {
            execute_set_status(deps, info, collection, CollectionStatus::Banned)
        }
        ExecuteMsg::UpdateConfig {
            owner,
            cw721_code_id,
            creation_fee,
            fee_collector,
            max_royalty_percentage,
        } => execute_update_config(
            deps,
            info,
            owner,
            cw721_code_id,
            creation_fee,
            fee_collector,
            max_royalty_percentage,
        ),
        ExecuteMsg::SetPaused { paused } => execute_set_paused(deps, info, paused),
        ExecuteMsg::WithdrawFees { recipient, amount } => {
            execute_withdraw_fees(deps, env, info, recipient, amount)
        }
    }
}

fn execute_create_collection(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    name: String,
    symbol: String,
    description: Option<String>,
    image: Option<String>,
    banner: Option<String>,
    external_url: Option<String>,
    royalty_percentage: Decimal,
    royalty_recipient: Option<String>,
    socials: Option<Socials>,
    categories: Option<Vec<String>>,
    max_supply: Option<u64>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Validate name
    if name.is_empty() || name.len() > 100 {
        return Err(ContractError::InvalidName {
            reason: "Name must be 1-100 characters".to_string(),
        });
    }

    // Check name uniqueness
    let name_lower = name.to_lowercase();
    if COLLECTION_BY_NAME.has(deps.storage, &name_lower) {
        return Err(ContractError::CollectionAlreadyExists { name });
    }

    // Validate symbol
    if symbol.is_empty() || symbol.len() > 20 {
        return Err(ContractError::InvalidSymbol {
            reason: "Symbol must be 1-20 characters".to_string(),
        });
    }

    // Validate royalty
    if royalty_percentage > config.max_royalty_percentage {
        return Err(ContractError::InvalidRoyaltyPercentage {});
    }

    // Check creation fee
    if let Some(ref fee) = config.creation_fee {
        let paid = info
            .funds
            .iter()
            .find(|c| c.denom == fee.denom)
            .map(|c| c.amount)
            .unwrap_or_default();

        if paid < fee.amount {
            return Err(ContractError::CreationFeeRequired {
                required: fee.to_string(),
            });
        }
    }

    let royalty_recipient_addr = royalty_recipient
        .map(|r| deps.api.addr_validate(&r))
        .transpose()?
        .unwrap_or_else(|| info.sender.clone());

    // Store pending collection data for reply
    let pending = PendingCollection {
        creator: info.sender.clone(),
        name: name.clone(),
        symbol: symbol.clone(),
        description,
        image,
        banner,
        external_url,
        royalty_percentage,
        royalty_recipient: royalty_recipient_addr.clone(),
        socials,
        categories: categories.unwrap_or_default(),
    };

    PENDING_COLLECTION.save(deps.storage, &pending)?;

    // Create CW721 instantiate message
    let cw721_msg = Cw721InstantiateMsg {
        name: name.clone(),
        symbol: symbol.clone(),
        minter: info.sender.to_string(),
        owner: Some(info.sender.to_string()),
        max_supply,
        royalty_info: Some(RoyaltyInfoMsg {
            payment_address: royalty_recipient_addr.to_string(),
            share: royalty_percentage,
        }),
    };

    let instantiate_msg = WasmMsg::Instantiate {
        admin: Some(info.sender.to_string()),
        code_id: config.cw721_code_id,
        msg: to_json_binary(&cw721_msg)?,
        funds: vec![],
        label: format!("NFT Collection: {}", name),
    };

    let submsg = SubMsg::reply_on_success(instantiate_msg, INSTANTIATE_REPLY_ID);

    Ok(Response::new()
        .add_submessage(submsg)
        .add_attribute("action", "create_collection")
        .add_attribute("creator", info.sender)
        .add_attribute("name", name)
        .add_attribute("symbol", symbol))
}

#[entry_point]
pub fn reply(deps: DepsMut, env: Env, msg: Reply) -> Result<Response, ContractError> {
    match msg.id {
        INSTANTIATE_REPLY_ID => handle_instantiate_reply(deps, env, msg),
        _ => Err(ContractError::ReplyError {
            msg: "Unknown reply ID".to_string(),
        }),
    }
}

fn handle_instantiate_reply(deps: DepsMut, env: Env, msg: Reply) -> Result<Response, ContractError> {
    let pending = PENDING_COLLECTION.load(deps.storage)?;
    PENDING_COLLECTION.remove(deps.storage);

    // Parse the contract address from the reply
    let res = msg.result.into_result().map_err(|e| ContractError::ReplyError { msg: e })?;
    
    let contract_address = res
        .events
        .iter()
        .find(|e| e.ty == "instantiate")
        .and_then(|e| {
            e.attributes
                .iter()
                .find(|a| a.key == "_contract_address")
                .map(|a| a.value.clone())
        })
        .ok_or_else(|| ContractError::ReplyError {
            msg: "Could not find contract address in reply".to_string(),
        })?;

    let contract_addr = deps.api.addr_validate(&contract_address)?;

    // Create collection record
    let collection = Collection {
        contract_address: contract_addr.clone(),
        name: pending.name.clone(),
        symbol: pending.symbol,
        description: pending.description,
        image: pending.image,
        banner: pending.banner,
        external_url: pending.external_url,
        creator: pending.creator.clone(),
        royalty_percentage: pending.royalty_percentage,
        royalty_recipient: pending.royalty_recipient,
        status: CollectionStatus::Unverified,
        created_at: env.block.time,
        socials: pending.socials,
        categories: pending.categories,
    };

    // Store collection
    COLLECTIONS.save(deps.storage, &contract_addr, &collection)?;
    COLLECTION_BY_NAME.save(deps.storage, &pending.name.to_lowercase(), &contract_addr)?;
    CREATOR_COLLECTIONS.save(deps.storage, (&pending.creator, &contract_addr), &true)?;

    // Increment count
    let count = COLLECTION_COUNT.load(deps.storage)? + 1;
    COLLECTION_COUNT.save(deps.storage, &count)?;

    Ok(Response::new()
        .add_attribute("action", "collection_created")
        .add_attribute("contract_address", contract_address)
        .add_attribute("collection_id", count.to_string()))
}

fn execute_update_collection(
    deps: DepsMut,
    info: MessageInfo,
    collection: String,
    description: Option<String>,
    image: Option<String>,
    banner: Option<String>,
    external_url: Option<String>,
    socials: Option<Socials>,
    categories: Option<Vec<String>>,
) -> Result<Response, ContractError> {
    let collection_addr = deps.api.addr_validate(&collection)?;

    let mut coll = COLLECTIONS
        .load(deps.storage, &collection_addr)
        .map_err(|_| ContractError::CollectionNotFound {
            address: collection.clone(),
        })?;

    // Only creator can update
    if info.sender != coll.creator {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(d) = description {
        coll.description = Some(d);
    }
    if let Some(i) = image {
        coll.image = Some(i);
    }
    if let Some(b) = banner {
        coll.banner = Some(b);
    }
    if let Some(u) = external_url {
        coll.external_url = Some(u);
    }
    if let Some(s) = socials {
        coll.socials = Some(s);
    }
    if let Some(c) = categories {
        coll.categories = c;
    }

    COLLECTIONS.save(deps.storage, &collection_addr, &coll)?;

    Ok(Response::new()
        .add_attribute("action", "update_collection")
        .add_attribute("collection", collection))
}

fn execute_update_royalty(
    deps: DepsMut,
    info: MessageInfo,
    collection: String,
    royalty_percentage: Option<Decimal>,
    royalty_recipient: Option<String>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;
    let collection_addr = deps.api.addr_validate(&collection)?;

    let mut coll = COLLECTIONS
        .load(deps.storage, &collection_addr)
        .map_err(|_| ContractError::CollectionNotFound {
            address: collection.clone(),
        })?;

    // Only creator can update
    if info.sender != coll.creator {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(percentage) = royalty_percentage {
        if percentage > config.max_royalty_percentage {
            return Err(ContractError::InvalidRoyaltyPercentage {});
        }
        coll.royalty_percentage = percentage;
    }

    if let Some(recipient) = royalty_recipient {
        coll.royalty_recipient = deps.api.addr_validate(&recipient)?;
    }

    COLLECTIONS.save(deps.storage, &collection_addr, &coll)?;

    Ok(Response::new()
        .add_attribute("action", "update_royalty")
        .add_attribute("collection", collection))
}

fn execute_set_status(
    deps: DepsMut,
    info: MessageInfo,
    collection: String,
    status: CollectionStatus,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    let collection_addr = deps.api.addr_validate(&collection)?;

    let mut coll = COLLECTIONS
        .load(deps.storage, &collection_addr)
        .map_err(|_| ContractError::CollectionNotFound {
            address: collection.clone(),
        })?;

    coll.status = status.clone();

    // Update verified index
    match status {
        CollectionStatus::Verified => {
            VERIFIED_COLLECTIONS.save(deps.storage, &collection_addr, &true)?;
        }
        _ => {
            VERIFIED_COLLECTIONS.remove(deps.storage, &collection_addr);
        }
    }

    COLLECTIONS.save(deps.storage, &collection_addr, &coll)?;

    Ok(Response::new()
        .add_attribute("action", "set_status")
        .add_attribute("collection", collection)
        .add_attribute("status", format!("{:?}", status)))
}

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    owner: Option<String>,
    cw721_code_id: Option<u64>,
    creation_fee: Option<Coin>,
    fee_collector: Option<String>,
    max_royalty_percentage: Option<Decimal>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(o) = owner {
        config.owner = deps.api.addr_validate(&o)?;
    }

    if let Some(code_id) = cw721_code_id {
        config.cw721_code_id = code_id;
    }

    if let Some(fee) = creation_fee {
        config.creation_fee = Some(fee);
    }

    if let Some(collector) = fee_collector {
        config.fee_collector = deps.api.addr_validate(&collector)?;
    }

    if let Some(max) = max_royalty_percentage {
        if max > Decimal::percent(100) {
            return Err(ContractError::InvalidRoyaltyPercentage {});
        }
        config.max_royalty_percentage = max;
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

fn execute_withdraw_fees(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    recipient: Option<String>,
    amount: Option<Coin>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    let recipient_addr = recipient
        .map(|r| deps.api.addr_validate(&r))
        .transpose()?
        .unwrap_or(config.fee_collector);

    let mut messages: Vec<CosmosMsg> = vec![];

    if let Some(coin) = amount {
        messages.push(CosmosMsg::Bank(BankMsg::Send {
            to_address: recipient_addr.to_string(),
            amount: vec![coin],
        }));
    } else {
        // Withdraw all - would need to query contract balance
        // For simplicity, we require explicit amount
    }

    Ok(Response::new()
        .add_messages(messages)
        .add_attribute("action", "withdraw_fees")
        .add_attribute("recipient", recipient_addr))
}

// ============ QUERY IMPLEMENTATIONS ============

#[entry_point]
pub fn query(deps: Deps, _env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::Collection { address } => to_json_binary(&query_collection(deps, address)?),
        QueryMsg::CollectionByName { name } => {
            to_json_binary(&query_collection_by_name(deps, name)?)
        }
        QueryMsg::Collections {
            creator,
            status,
            category,
            verified_only,
            start_after,
            limit,
        } => to_json_binary(&query_collections(
            deps,
            creator,
            status,
            category,
            verified_only,
            start_after,
            limit,
        )?),
        QueryMsg::CreatorCollections {
            creator,
            start_after,
            limit,
        } => to_json_binary(&query_creator_collections(deps, creator, start_after, limit)?),
        QueryMsg::VerifiedCollections { start_after, limit } => {
            to_json_binary(&query_verified_collections(deps, start_after, limit)?)
        }
        QueryMsg::CollectionCount {} => to_json_binary(&query_collection_count(deps)?),
        QueryMsg::NameAvailable { name } => to_json_binary(&query_name_available(deps, name)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        owner: config.owner.to_string(),
        cw721_code_id: config.cw721_code_id,
        creation_fee: config.creation_fee,
        fee_collector: config.fee_collector.to_string(),
        paused: config.paused,
        max_royalty_percentage: config.max_royalty_percentage,
    })
}

fn query_collection(deps: Deps, address: String) -> StdResult<CollectionResponse> {
    let addr = deps.api.addr_validate(&address)?;
    let collection = COLLECTIONS.may_load(deps.storage, &addr)?;
    Ok(CollectionResponse { collection })
}

fn query_collection_by_name(deps: Deps, name: String) -> StdResult<CollectionResponse> {
    let name_lower = name.to_lowercase();
    let addr = COLLECTION_BY_NAME.may_load(deps.storage, &name_lower)?;

    let collection = match addr {
        Some(a) => COLLECTIONS.may_load(deps.storage, &a)?,
        None => None,
    };

    Ok(CollectionResponse { collection })
}

fn query_collections(
    deps: Deps,
    creator: Option<String>,
    status: Option<CollectionStatus>,
    category: Option<String>,
    verified_only: Option<bool>,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<CollectionsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;
    let verified_only = verified_only.unwrap_or(false);

    let creator_addr = creator
        .map(|c| deps.api.addr_validate(&c))
        .transpose()?;

    let start = start_after
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let collections: Vec<Collection> = COLLECTIONS
        .range(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| item.ok())
        .map(|(_, coll)| coll)
        .filter(|c| {
            // Filter by creator
            if let Some(ref creator) = creator_addr {
                if c.creator != *creator {
                    return false;
                }
            }
            // Filter by status
            if let Some(ref s) = status {
                if c.status != *s {
                    return false;
                }
            }
            // Filter by category
            if let Some(ref cat) = category {
                if !c.categories.contains(cat) {
                    return false;
                }
            }
            // Filter verified only
            if verified_only && !matches!(c.status, CollectionStatus::Verified) {
                return false;
            }
            true
        })
        .collect();

    Ok(CollectionsResponse { collections })
}

fn query_creator_collections(
    deps: Deps,
    creator: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<CollectionsResponse> {
    let creator_addr = deps.api.addr_validate(&creator)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let collections: Vec<Collection> = CREATOR_COLLECTIONS
        .prefix(&creator_addr)
        .keys(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| item.ok())
        .filter_map(|addr| COLLECTIONS.load(deps.storage, &addr).ok())
        .collect();

    Ok(CollectionsResponse { collections })
}

fn query_verified_collections(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<CollectionsResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after
        .map(|s| deps.api.addr_validate(&s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let collections: Vec<Collection> = VERIFIED_COLLECTIONS
        .keys(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| item.ok())
        .filter_map(|addr| COLLECTIONS.load(deps.storage, &addr).ok())
        .collect();

    Ok(CollectionsResponse { collections })
}

fn query_collection_count(deps: Deps) -> StdResult<CountResponse> {
    let count = COLLECTION_COUNT.load(deps.storage)?;
    Ok(CountResponse { count })
}

fn query_name_available(deps: Deps, name: String) -> StdResult<NameAvailableResponse> {
    let name_lower = name.to_lowercase();
    let available = !COLLECTION_BY_NAME.has(deps.storage, &name_lower);
    Ok(NameAvailableResponse { available })
}
