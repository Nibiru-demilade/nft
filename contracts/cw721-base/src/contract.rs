use cosmwasm_std::{
    entry_point, to_json_binary, Addr, Binary, Deps, DepsMut, Env, MessageInfo,
    Order, Response, StdResult, Timestamp,
};
use cw2::set_contract_version;

use crate::error::ContractError;
use crate::msg::{
    AllNftInfoResponse, ApprovalMsg, ApprovalResponse, ApprovalsResponse, ConfigResponse,
    ContractInfoResponse, ExecuteMsg, InstantiateMsg, MintMsg, NftInfoResponse, NumTokensResponse,
    OperatorMsg, OperatorResponse, OperatorsResponse, OwnerOfResponse, QueryMsg,
    RoyaltyInfoResponse, CollectionRoyaltyResponse, TokensResponse,
};
use crate::state::{
    Approval, Config, Expiration, Metadata, OperatorApproval, RoyaltyInfo, TokenInfo,
    CONFIG, COLLECTION_ROYALTY, OPERATOR_APPROVALS, OWNER_TOKENS, TOKENS, TOKEN_APPROVALS,
};

const CONTRACT_NAME: &str = "crates.io:nibiru-cw721";
const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");
const MAX_BATCH_SIZE: u32 = 100;
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

    let minter = deps.api.addr_validate(&msg.minter)?;
    let owner = msg
        .owner
        .map(|o| deps.api.addr_validate(&o))
        .transpose()?
        .unwrap_or_else(|| minter.clone());

    let config = Config {
        name: msg.name.clone(),
        symbol: msg.symbol.clone(),
        minter,
        owner,
        minting_enabled: true,
        max_supply: msg.max_supply,
        token_count: 0,
    };

    CONFIG.save(deps.storage, &config)?;

    // Set collection royalty if provided
    if let Some(royalty) = msg.royalty_info {
        if royalty.share > cosmwasm_std::Decimal::percent(100) {
            return Err(ContractError::InvalidRoyaltyPercentage {});
        }
        let royalty_info = RoyaltyInfo {
            payment_address: deps.api.addr_validate(&royalty.payment_address)?,
            share: royalty.share,
        };
        COLLECTION_ROYALTY.save(deps.storage, &royalty_info)?;
    }

    Ok(Response::new()
        .add_attribute("action", "instantiate")
        .add_attribute("name", msg.name)
        .add_attribute("symbol", msg.symbol))
}

#[entry_point]
pub fn execute(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    match msg {
        ExecuteMsg::Mint {
            token_id,
            owner,
            token_uri,
            extension,
        } => execute_mint(deps, env, info, token_id, owner, token_uri, extension),
        ExecuteMsg::BatchMint { tokens } => execute_batch_mint(deps, env, info, tokens),
        ExecuteMsg::TransferNft {
            recipient,
            token_id,
        } => execute_transfer(deps, env, info, recipient, token_id),
        ExecuteMsg::SendNft {
            contract,
            token_id,
            msg,
        } => execute_send(deps, env, info, contract, token_id, msg),
        ExecuteMsg::Approve {
            spender,
            token_id,
            expires,
        } => execute_approve(deps, env, info, spender, token_id, expires),
        ExecuteMsg::Revoke { spender, token_id } => {
            execute_revoke(deps, env, info, spender, token_id)
        }
        ExecuteMsg::ApproveAll { operator, expires } => {
            execute_approve_all(deps, env, info, operator, expires)
        }
        ExecuteMsg::RevokeAll { operator } => execute_revoke_all(deps, info, operator),
        ExecuteMsg::Burn { token_id } => execute_burn(deps, env, info, token_id),
        ExecuteMsg::UpdateMetadata {
            token_id,
            token_uri,
            extension,
        } => execute_update_metadata(deps, info, token_id, token_uri, extension),
        ExecuteMsg::UpdateConfig {
            minter,
            owner,
            minting_enabled,
            max_supply,
        } => execute_update_config(deps, info, minter, owner, minting_enabled, max_supply),
        ExecuteMsg::UpdateRoyalty { royalty_info } => {
            execute_update_royalty(deps, info, royalty_info)
        }
    }
}

fn execute_mint(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
    owner: String,
    token_uri: Option<String>,
    extension: Metadata,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    // Check minter
    if info.sender != config.minter {
        return Err(ContractError::Unauthorized {});
    }

    // Check minting enabled
    if !config.minting_enabled {
        return Err(ContractError::MintingDisabled {});
    }

    // Check max supply
    if let Some(max) = config.max_supply {
        if config.token_count >= max {
            return Err(ContractError::BatchSizeExceeded { max: max as u32 });
        }
    }

    // Check token doesn't exist
    if TOKENS.has(deps.storage, &token_id) {
        return Err(ContractError::TokenAlreadyExists { token_id });
    }

    let owner_addr = deps.api.addr_validate(&owner)?;

    let token_info = TokenInfo {
        owner: owner_addr.clone(),
        token_uri,
        extension,
        minted_at: env.block.time,
    };

    TOKENS.save(deps.storage, &token_id, &token_info)?;
    OWNER_TOKENS.save(deps.storage, (&owner_addr, &token_id), &true)?;

    config.token_count += 1;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "mint")
        .add_attribute("token_id", token_id)
        .add_attribute("owner", owner))
}

fn execute_batch_mint(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    tokens: Vec<MintMsg>,
) -> Result<Response, ContractError> {
    if tokens.len() > MAX_BATCH_SIZE as usize {
        return Err(ContractError::BatchSizeExceeded { max: MAX_BATCH_SIZE });
    }

    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.minter {
        return Err(ContractError::Unauthorized {});
    }

    if !config.minting_enabled {
        return Err(ContractError::MintingDisabled {});
    }

    // Check max supply
    if let Some(max) = config.max_supply {
        if config.token_count + tokens.len() as u64 > max {
            return Err(ContractError::BatchSizeExceeded { max: max as u32 });
        }
    }

    let mut minted_ids = Vec::with_capacity(tokens.len());

    for mint in tokens {
        if TOKENS.has(deps.storage, &mint.token_id) {
            return Err(ContractError::TokenAlreadyExists {
                token_id: mint.token_id,
            });
        }

        let owner_addr = deps.api.addr_validate(&mint.owner)?;

        let token_info = TokenInfo {
            owner: owner_addr.clone(),
            token_uri: mint.token_uri,
            extension: mint.extension,
            minted_at: env.block.time,
        };

        TOKENS.save(deps.storage, &mint.token_id, &token_info)?;
        OWNER_TOKENS.save(deps.storage, (&owner_addr, &mint.token_id), &true)?;
        minted_ids.push(mint.token_id);
    }

    config.token_count += minted_ids.len() as u64;
    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new()
        .add_attribute("action", "batch_mint")
        .add_attribute("count", minted_ids.len().to_string()))
}

fn execute_transfer(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    recipient: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let mut token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    // Check authorization
    check_can_transfer(deps.as_ref(), &env, &info.sender, &token, &token_id)?;

    let recipient_addr = deps.api.addr_validate(&recipient)?;
    let old_owner = token.owner.clone();

    // Update ownership
    OWNER_TOKENS.remove(deps.storage, (&old_owner, &token_id));
    OWNER_TOKENS.save(deps.storage, (&recipient_addr, &token_id), &true)?;

    token.owner = recipient_addr;
    TOKENS.save(deps.storage, &token_id, &token)?;

    // Clear approvals
    clear_token_approvals(deps, &token_id)?;

    Ok(Response::new()
        .add_attribute("action", "transfer")
        .add_attribute("token_id", token_id)
        .add_attribute("from", old_owner)
        .add_attribute("to", recipient))
}

fn execute_send(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    contract: String,
    token_id: String,
    msg: Binary,
) -> Result<Response, ContractError> {
    let mut token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    check_can_transfer(deps.as_ref(), &env, &info.sender, &token, &token_id)?;

    let contract_addr = deps.api.addr_validate(&contract)?;
    let old_owner = token.owner.clone();

    // Update ownership
    OWNER_TOKENS.remove(deps.storage, (&old_owner, &token_id));
    OWNER_TOKENS.save(deps.storage, (&contract_addr, &token_id), &true)?;

    token.owner = contract_addr.clone();
    TOKENS.save(deps.storage, &token_id, &token)?;

    // Clear approvals
    clear_token_approvals(deps, &token_id)?;

    // Create send message
    let send_msg = cw721::Cw721ReceiveMsg {
        sender: info.sender.to_string(),
        token_id: token_id.clone(),
        msg,
    };

    Ok(Response::new()
        .add_message(send_msg.into_cosmos_msg(contract)?)
        .add_attribute("action", "send_nft")
        .add_attribute("token_id", token_id)
        .add_attribute("from", old_owner)
        .add_attribute("to", contract_addr))
}

fn execute_approve(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    spender: String,
    token_id: String,
    expires: Option<Expiration>,
) -> Result<Response, ContractError> {
    let token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    // Only owner can approve
    if info.sender != token.owner {
        return Err(ContractError::Unauthorized {});
    }

    let spender_addr = deps.api.addr_validate(&spender)?;
    let expires = expires.unwrap_or(Expiration::Never);

    // Check expiration is valid
    if let Expiration::AtHeight(h) = expires {
        if h <= env.block.height {
            return Err(ContractError::Expired {});
        }
    }
    if let Expiration::AtTime(t) = expires {
        if t <= env.block.time {
            return Err(ContractError::Expired {});
        }
    }

    let approval = Approval {
        spender: spender_addr.clone(),
        expires,
    };

    TOKEN_APPROVALS.save(deps.storage, (&token_id, &spender_addr), &approval)?;

    Ok(Response::new()
        .add_attribute("action", "approve")
        .add_attribute("token_id", token_id)
        .add_attribute("spender", spender))
}

fn execute_revoke(
    deps: DepsMut,
    _env: Env,
    info: MessageInfo,
    spender: String,
    token_id: String,
) -> Result<Response, ContractError> {
    let token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    if info.sender != token.owner {
        return Err(ContractError::Unauthorized {});
    }

    let spender_addr = deps.api.addr_validate(&spender)?;
    TOKEN_APPROVALS.remove(deps.storage, (&token_id, &spender_addr));

    Ok(Response::new()
        .add_attribute("action", "revoke")
        .add_attribute("token_id", token_id)
        .add_attribute("spender", spender))
}

fn execute_approve_all(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    operator: String,
    expires: Option<Expiration>,
) -> Result<Response, ContractError> {
    let operator_addr = deps.api.addr_validate(&operator)?;
    let expires = expires.unwrap_or(Expiration::Never);

    // Check expiration is valid
    if let Expiration::AtHeight(h) = expires {
        if h <= env.block.height {
            return Err(ContractError::Expired {});
        }
    }
    if let Expiration::AtTime(t) = expires {
        if t <= env.block.time {
            return Err(ContractError::Expired {});
        }
    }

    let approval = OperatorApproval { expires };

    OPERATOR_APPROVALS.save(deps.storage, (&info.sender, &operator_addr), &approval)?;

    Ok(Response::new()
        .add_attribute("action", "approve_all")
        .add_attribute("operator", operator))
}

fn execute_revoke_all(
    deps: DepsMut,
    info: MessageInfo,
    operator: String,
) -> Result<Response, ContractError> {
    let operator_addr = deps.api.addr_validate(&operator)?;
    OPERATOR_APPROVALS.remove(deps.storage, (&info.sender, &operator_addr));

    Ok(Response::new()
        .add_attribute("action", "revoke_all")
        .add_attribute("operator", operator))
}

fn execute_burn(
    deps: DepsMut,
    env: Env,
    info: MessageInfo,
    token_id: String,
) -> Result<Response, ContractError> {
    let token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    check_can_transfer(deps.as_ref(), &env, &info.sender, &token, &token_id)?;

    // Remove token
    TOKENS.remove(deps.storage, &token_id);
    OWNER_TOKENS.remove(deps.storage, (&token.owner, &token_id));

    // Update count
    let mut config = CONFIG.load(deps.storage)?;
    config.token_count = config.token_count.saturating_sub(1);
    CONFIG.save(deps.storage, &config)?;

    // Clear approvals
    clear_token_approvals(deps, &token_id)?;

    Ok(Response::new()
        .add_attribute("action", "burn")
        .add_attribute("token_id", token_id))
}

fn execute_update_metadata(
    deps: DepsMut,
    info: MessageInfo,
    token_id: String,
    token_uri: Option<String>,
    extension: Option<Metadata>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    // Only owner can update metadata
    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    let mut token = TOKENS
        .load(deps.storage, &token_id)
        .map_err(|_| ContractError::TokenNotFound {
            token_id: token_id.clone(),
        })?;

    if let Some(uri) = token_uri {
        token.token_uri = Some(uri);
    }

    if let Some(ext) = extension {
        token.extension = ext;
    }

    TOKENS.save(deps.storage, &token_id, &token)?;

    Ok(Response::new()
        .add_attribute("action", "update_metadata")
        .add_attribute("token_id", token_id))
}

fn execute_update_config(
    deps: DepsMut,
    info: MessageInfo,
    minter: Option<String>,
    owner: Option<String>,
    minting_enabled: Option<bool>,
    max_supply: Option<u64>,
) -> Result<Response, ContractError> {
    let mut config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(m) = minter {
        config.minter = deps.api.addr_validate(&m)?;
    }

    if let Some(o) = owner {
        config.owner = deps.api.addr_validate(&o)?;
    }

    if let Some(enabled) = minting_enabled {
        config.minting_enabled = enabled;
    }

    if let Some(max) = max_supply {
        config.max_supply = Some(max);
    }

    CONFIG.save(deps.storage, &config)?;

    Ok(Response::new().add_attribute("action", "update_config"))
}

fn execute_update_royalty(
    deps: DepsMut,
    info: MessageInfo,
    royalty_info: Option<crate::msg::RoyaltyInfoMsg>,
) -> Result<Response, ContractError> {
    let config = CONFIG.load(deps.storage)?;

    if info.sender != config.owner {
        return Err(ContractError::Unauthorized {});
    }

    if let Some(royalty) = royalty_info {
        if royalty.share > cosmwasm_std::Decimal::percent(100) {
            return Err(ContractError::InvalidRoyaltyPercentage {});
        }
        let royalty_info = RoyaltyInfo {
            payment_address: deps.api.addr_validate(&royalty.payment_address)?,
            share: royalty.share,
        };
        COLLECTION_ROYALTY.save(deps.storage, &royalty_info)?;
    } else {
        COLLECTION_ROYALTY.remove(deps.storage);
    }

    Ok(Response::new().add_attribute("action", "update_royalty"))
}

// Helper functions
fn check_can_transfer(
    deps: Deps,
    env: &Env,
    sender: &Addr,
    token: &TokenInfo,
    token_id: &str,
) -> Result<(), ContractError> {
    // Owner can always transfer
    if sender == &token.owner {
        return Ok(());
    }

    // Check token-level approval
    if let Ok(approval) = TOKEN_APPROVALS.load(deps.storage, (token_id, sender)) {
        if !approval.expires.is_expired(env.block.height, env.block.time) {
            return Ok(());
        }
    }

    // Check operator approval
    if let Ok(approval) = OPERATOR_APPROVALS.load(deps.storage, (&token.owner, sender)) {
        if !approval.expires.is_expired(env.block.height, env.block.time) {
            return Ok(());
        }
    }

    Err(ContractError::Unauthorized {})
}

fn clear_token_approvals(deps: DepsMut, token_id: &str) -> Result<(), ContractError> {
    let approvals: Vec<_> = TOKEN_APPROVALS
        .prefix(token_id)
        .keys(deps.storage, None, None, Order::Ascending)
        .collect::<StdResult<Vec<_>>>()?;

    for spender in approvals {
        TOKEN_APPROVALS.remove(deps.storage, (token_id, &spender));
    }

    Ok(())
}

#[entry_point]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> StdResult<Binary> {
    match msg {
        QueryMsg::Config {} => to_json_binary(&query_config(deps)?),
        QueryMsg::NftInfo { token_id } => to_json_binary(&query_nft_info(deps, token_id)?),
        QueryMsg::AllNftInfo { token_id } => to_json_binary(&query_all_nft_info(deps, env, token_id)?),
        QueryMsg::OwnerOf { token_id } => to_json_binary(&query_owner_of(deps, env, token_id)?),
        QueryMsg::Tokens {
            owner,
            start_after,
            limit,
        } => to_json_binary(&query_tokens(deps, owner, start_after, limit)?),
        QueryMsg::AllTokens { start_after, limit } => {
            to_json_binary(&query_all_tokens(deps, start_after, limit)?)
        }
        QueryMsg::Approval { token_id, spender } => {
            to_json_binary(&query_approval(deps, env, token_id, spender)?)
        }
        QueryMsg::Approvals { token_id } => to_json_binary(&query_approvals(deps, env, token_id)?),
        QueryMsg::Operator { owner, operator } => {
            to_json_binary(&query_operator(deps, env, owner, operator)?)
        }
        QueryMsg::AllOperators {
            owner,
            start_after,
            limit,
        } => to_json_binary(&query_all_operators(deps, env, owner, start_after, limit)?),
        QueryMsg::NumTokens {} => to_json_binary(&query_num_tokens(deps)?),
        QueryMsg::ContractInfo {} => to_json_binary(&query_contract_info(deps)?),
        QueryMsg::RoyaltyInfo {
            token_id,
            sale_price,
        } => to_json_binary(&query_royalty_info(deps, token_id, sale_price)?),
        QueryMsg::CollectionRoyalty {} => to_json_binary(&query_collection_royalty(deps)?),
    }
}

fn query_config(deps: Deps) -> StdResult<ConfigResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ConfigResponse {
        name: config.name,
        symbol: config.symbol,
        minter: config.minter.to_string(),
        owner: config.owner.to_string(),
        minting_enabled: config.minting_enabled,
        max_supply: config.max_supply,
        token_count: config.token_count,
    })
}

fn query_nft_info(deps: Deps, token_id: String) -> StdResult<NftInfoResponse> {
    let token = TOKENS.load(deps.storage, &token_id)?;
    Ok(NftInfoResponse {
        token_uri: token.token_uri,
        extension: token.extension,
    })
}

fn query_all_nft_info(deps: Deps, env: Env, token_id: String) -> StdResult<AllNftInfoResponse> {
    let token = TOKENS.load(deps.storage, &token_id)?;
    let approvals = get_token_approvals(deps, &env, &token_id)?;

    Ok(AllNftInfoResponse {
        access: OwnerOfResponse {
            owner: token.owner.to_string(),
            approvals,
        },
        info: NftInfoResponse {
            token_uri: token.token_uri,
            extension: token.extension,
        },
    })
}

fn query_owner_of(deps: Deps, env: Env, token_id: String) -> StdResult<OwnerOfResponse> {
    let token = TOKENS.load(deps.storage, &token_id)?;
    let approvals = get_token_approvals(deps, &env, &token_id)?;

    Ok(OwnerOfResponse {
        owner: token.owner.to_string(),
        approvals,
    })
}

fn query_tokens(
    deps: Deps,
    owner: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<TokensResponse> {
    let owner_addr = deps.api.addr_validate(&owner)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after.as_deref().map(|s| cosmwasm_std::Bound::exclusive(s));

    let tokens: Vec<String> = OWNER_TOKENS
        .prefix(&owner_addr)
        .keys(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .collect::<StdResult<Vec<_>>>()?;

    Ok(TokensResponse { tokens })
}

fn query_all_tokens(
    deps: Deps,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<TokensResponse> {
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after.as_deref().map(|s| cosmwasm_std::Bound::exclusive(s));

    let tokens: Vec<String> = TOKENS
        .keys(deps.storage, start, None, Order::Ascending)
        .take(limit)
        .collect::<StdResult<Vec<_>>>()?;

    Ok(TokensResponse { tokens })
}

fn query_approval(
    deps: Deps,
    env: Env,
    token_id: String,
    spender: String,
) -> StdResult<ApprovalResponse> {
    let spender_addr = deps.api.addr_validate(&spender)?;
    let approval = TOKEN_APPROVALS.load(deps.storage, (&token_id, &spender_addr))?;

    Ok(ApprovalResponse {
        approval: ApprovalMsg {
            spender: approval.spender.to_string(),
            expires: approval.expires,
        },
    })
}

fn query_approvals(deps: Deps, env: Env, token_id: String) -> StdResult<ApprovalsResponse> {
    let approvals = get_token_approvals(deps, &env, &token_id)?;
    Ok(ApprovalsResponse { approvals })
}

fn query_operator(
    deps: Deps,
    env: Env,
    owner: String,
    operator: String,
) -> StdResult<OperatorResponse> {
    let owner_addr = deps.api.addr_validate(&owner)?;
    let operator_addr = deps.api.addr_validate(&operator)?;

    match OPERATOR_APPROVALS.load(deps.storage, (&owner_addr, &operator_addr)) {
        Ok(approval) => {
            let is_expired = approval.expires.is_expired(env.block.height, env.block.time);
            Ok(OperatorResponse {
                approved: !is_expired,
                expires: Some(approval.expires),
            })
        }
        Err(_) => Ok(OperatorResponse {
            approved: false,
            expires: None,
        }),
    }
}

fn query_all_operators(
    deps: Deps,
    env: Env,
    owner: String,
    start_after: Option<String>,
    limit: Option<u32>,
) -> StdResult<OperatorsResponse> {
    let owner_addr = deps.api.addr_validate(&owner)?;
    let limit = limit.unwrap_or(DEFAULT_LIMIT).min(MAX_LIMIT) as usize;

    let start = start_after
        .as_ref()
        .map(|s| deps.api.addr_validate(s))
        .transpose()?;
    let start_bound = start.as_ref().map(|a| cosmwasm_std::Bound::exclusive(a));

    let operators: Vec<OperatorMsg> = OPERATOR_APPROVALS
        .prefix(&owner_addr)
        .range(deps.storage, start_bound, None, Order::Ascending)
        .take(limit)
        .filter_map(|item| {
            item.ok().and_then(|(operator, approval)| {
                if !approval.expires.is_expired(env.block.height, env.block.time) {
                    Some(OperatorMsg {
                        operator: operator.to_string(),
                        expires: approval.expires,
                    })
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(OperatorsResponse { operators })
}

fn query_num_tokens(deps: Deps) -> StdResult<NumTokensResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(NumTokensResponse {
        count: config.token_count,
    })
}

fn query_contract_info(deps: Deps) -> StdResult<ContractInfoResponse> {
    let config = CONFIG.load(deps.storage)?;
    Ok(ContractInfoResponse {
        name: config.name,
        symbol: config.symbol,
    })
}

fn query_royalty_info(deps: Deps, token_id: String, sale_price: u128) -> StdResult<RoyaltyInfoResponse> {
    // First check token-level royalty
    let token = TOKENS.load(deps.storage, &token_id)?;
    
    let royalty = token
        .extension
        .royalty_info
        .or_else(|| COLLECTION_ROYALTY.load(deps.storage).ok());

    match royalty {
        Some(r) => {
            let royalty_amount = cosmwasm_std::Decimal::from_ratio(sale_price, 1u128) * r.share;
            Ok(RoyaltyInfoResponse {
                payment_address: r.payment_address.to_string(),
                royalty_amount: royalty_amount.to_uint_floor().u128(),
            })
        }
        None => Ok(RoyaltyInfoResponse {
            payment_address: String::new(),
            royalty_amount: 0,
        }),
    }
}

fn query_collection_royalty(deps: Deps) -> StdResult<CollectionRoyaltyResponse> {
    let royalty_info = COLLECTION_ROYALTY.may_load(deps.storage)?;
    Ok(CollectionRoyaltyResponse { royalty_info })
}

fn get_token_approvals(deps: Deps, env: &Env, token_id: &str) -> StdResult<Vec<ApprovalMsg>> {
    TOKEN_APPROVALS
        .prefix(token_id)
        .range(deps.storage, None, None, Order::Ascending)
        .filter_map(|item| {
            item.ok().and_then(|(_, approval)| {
                if !approval.expires.is_expired(env.block.height, env.block.time) {
                    Some(ApprovalMsg {
                        spender: approval.spender.to_string(),
                        expires: approval.expires,
                    })
                } else {
                    None
                }
            })
        })
        .collect::<Vec<_>>()
        .into_iter()
        .map(Ok)
        .collect()
}
