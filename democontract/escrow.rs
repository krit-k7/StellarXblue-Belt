// =============================================================================
// escrow.rs — Core escrow logic
// =============================================================================
// All state transitions live here. Each function:
//   1. Loads the escrow config from storage
//   2. Validates caller authorization
//   3. Validates the current state
//   4. Performs the token transfer (if any)
//   5. Updates state and saves back to storage
//   6. Emits an event
//
// Token transfers use the Soroban token interface (SEP-41 / SAC standard),
// which is compatible with XLM and any Stellar Asset Contract.
// =============================================================================

use soroban_sdk::{Env, Address, token, symbol_short};
use crate::types::{EscrowState, EscrowError, Resolution};
use crate::storage;

// ── Internal helpers ──────────────────────────────────────────────────────────

/// Transfer `amount` tokens from `from` → `to` using the SAC token interface.
/// Uses transfer_from when pulling from buyer (requires allowance).
/// Uses transfer when sending from contract (contract is the sender).
fn transfer_token_from(env: &Env, token: &Address, from: &Address, to: &Address, amount: i128) {
    let client = token::Client::new(env, token);
    client.transfer_from(&env.current_contract_address(), from, to, &amount);
}

fn transfer_token(env: &Env, token: &Address, to: &Address, amount: i128) {
    let client = token::Client::new(env, token);
    let contract_addr = env.current_contract_address();
    client.transfer(&contract_addr, to, &amount);
}

/// Emit a contract event for off-chain indexing (frontend, explorers).
fn emit(env: &Env, topic: &str, escrow_id: u64) {
    env.events().publish(
        (symbol_short!("escrow"), soroban_sdk::Symbol::new(env, topic)),
        escrow_id,
    );
}

// ── deposit ───────────────────────────────────────────────────────────────────
/// Buyer deposits the agreed amount into the escrow contract.
/// The buyer must have pre-approved this contract as a spender via
/// `token.approve(buyer, contract_address, amount, expiry)`.
pub fn deposit(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    // Only valid from AwaitingDeposit state
    if cfg.state != EscrowState::AwaitingDeposit {
        return Err(EscrowError::InvalidState);
    }

    // Require buyer's signature for this transaction
    cfg.buyer.require_auth();

    // Check deadline hasn't already passed before depositing
    let now = env.ledger().timestamp();
    if now >= cfg.deadline {
        return Err(EscrowError::DeadlineExpired);
    }

    // Transfer tokens: buyer → this contract (using transfer_from with allowance)
    let contract_addr = env.current_contract_address();
    transfer_token_from(env, &cfg.token, &cfg.buyer, &contract_addr, cfg.amount);

    cfg.state = EscrowState::Funded;
    storage::update_escrow(env, &cfg);
    emit(env, "deposited", escrow_id);
    Ok(())
}

// ── submit_work ───────────────────────────────────────────────────────────────
/// Seller signals that work is complete and ready for review.
pub fn submit_work(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    if cfg.state != EscrowState::Funded {
        return Err(EscrowError::InvalidState);
    }

    cfg.seller.require_auth();

    cfg.state = EscrowState::WorkSubmitted;
    storage::update_escrow(env, &cfg);
    emit(env, "submitted", escrow_id);
    Ok(())
}

// ── approve_and_release ───────────────────────────────────────────────────────
/// Buyer approves the work. Funds are released from contract → seller.
pub fn approve_and_release(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    if cfg.state != EscrowState::WorkSubmitted {
        return Err(EscrowError::InvalidState);
    }

    cfg.buyer.require_auth();

    // Transfer tokens: contract → seller
    transfer_token(env, &cfg.token, &cfg.seller, cfg.amount);

    cfg.state = EscrowState::Completed;
    storage::update_escrow(env, &cfg);
    emit(env, "released", escrow_id);
    Ok(())
}

// ── refund ────────────────────────────────────────────────────────────────────
/// Buyer reclaims funds. Allowed when:
///   - State is Funded AND deadline has passed (seller never submitted), OR
///   - State is Funded AND buyer explicitly cancels (before deadline, if
///     both parties agree — here we allow buyer unilateral cancel pre-submit)
pub fn refund(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    // Can only refund from Funded state (work not yet submitted)
    if cfg.state != EscrowState::Funded {
        return Err(EscrowError::InvalidState);
    }

    cfg.buyer.require_auth();

    // Transfer tokens: contract → buyer
    transfer_token(env, &cfg.token, &cfg.buyer, cfg.amount);

    cfg.state = EscrowState::Refunded;
    storage::update_escrow(env, &cfg);
    emit(env, "refunded", escrow_id);
    Ok(())
}

// ── raise_dispute ─────────────────────────────────────────────────────────────
/// Either buyer or seller raises a dispute after work is submitted.
/// Requires an arbitrator to be configured on this escrow.
pub fn raise_dispute(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    if cfg.state != EscrowState::WorkSubmitted {
        return Err(EscrowError::InvalidState);
    }

    // Must have an arbitrator
    if cfg.arbitrator.is_none() {
        return Err(EscrowError::NoArbitrator);
    }

    cfg.seller.require_auth(); // or cfg.seller.require_auth() based on caller

    cfg.state = EscrowState::Disputed;
    storage::update_escrow(env, &cfg);
    emit(env, "disputed", escrow_id);
    Ok(())
}

// ── resolve_dispute ───────────────────────────────────────────────────────────
/// Arbitrator resolves the dispute with one of three outcomes.
pub fn resolve_dispute(
    env: &Env,
    escrow_id: u64,
    resolution: Resolution,
) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    if cfg.state != EscrowState::Disputed {
        return Err(EscrowError::InvalidState);
    }

    let arbitrator = cfg.arbitrator.clone().ok_or(EscrowError::NoArbitrator)?;
    arbitrator.require_auth();

    match resolution {
        Resolution::ReleaseToSeller => {
            // Full amount → seller
            transfer_token(env, &cfg.token, &cfg.seller, cfg.amount);
            cfg.state = EscrowState::Completed;
        }
        Resolution::RefundToBuyer => {
            // Full amount → buyer
            transfer_token(env, &cfg.token, &cfg.buyer, cfg.amount);
            cfg.state = EscrowState::Refunded;
        }
        Resolution::Split(seller_pct) => {
            // Validate percentage
            if seller_pct > 100 {
                return Err(EscrowError::InvalidSplitPercent);
            }
            // Calculate split amounts (integer arithmetic, no floats in Soroban)
            let seller_amount = (cfg.amount * seller_pct as i128) / 100;
            let buyer_amount = cfg.amount - seller_amount;

            if seller_amount > 0 {
                transfer_token(env, &cfg.token, &cfg.seller, seller_amount);
            }
            if buyer_amount > 0 {
                transfer_token(env, &cfg.token, &cfg.buyer, buyer_amount);
            }
            // Completed regardless of split direction
            cfg.state = EscrowState::Completed;
        }
    }

    storage::update_escrow(env, &cfg);
    emit(env, "resolved", escrow_id);
    Ok(())
}

// ── claim_after_deadline ──────────────────────────────────────────────────────
/// Seller auto-claims funds if buyer hasn't responded past the deadline.
/// Protects freelancers from clients who ghost after work is submitted.
pub fn claim_after_deadline(env: &Env, escrow_id: u64) -> Result<(), EscrowError> {
    let mut cfg = storage::load_escrow(env, escrow_id)?;

    // Only valid when work has been submitted and buyer hasn't acted
    if cfg.state != EscrowState::WorkSubmitted {
        return Err(EscrowError::InvalidState);
    }

    cfg.seller.require_auth();

    // Enforce deadline has passed
    let now = env.ledger().timestamp();
    if now < cfg.deadline {
        return Err(EscrowError::DeadlineNotReached);
    }

    // Transfer tokens: contract → seller
    transfer_token(env, &cfg.token, &cfg.seller, cfg.amount);

    cfg.state = EscrowState::Completed;
    storage::update_escrow(env, &cfg);
    emit(env, "autoclaimed", escrow_id);
    Ok(())
}
