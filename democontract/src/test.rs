#![cfg(test)]

use crate::{TrustWorkEscrowContract, TrustWorkEscrowContractClient};
use crate::types::{EscrowError, EscrowState, Resolution};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

/// Spins up a fresh env, a deployed escrow contract, and a funded test token.
/// Returns (env, contract_client, buyer, seller, arbitrator, token_address).
fn setup() -> (
    Env,
    TrustWorkEscrowContractClient<'static>,
    Address,
    Address,
    Address,
    Address,
) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TrustWorkEscrowContract);
    let client = TrustWorkEscrowContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let arbitrator = Address::generate(&env);

    // Deploy a Stellar Asset Contract to use as the payment token in tests.
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_address = sac.address();
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);
    token_admin_client.mint(&buyer, &1_000_000);

    (env, client, buyer, seller, arbitrator, token_address)
}

fn desc(env: &Env) -> String {
    String::from_str(env, "logo redesign")
}

// ── create_escrow validation ───────────────────────────────────────────────

#[test]
fn create_escrow_rejects_zero_amount() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let result = client.try_create_escrow(
        &buyer, &seller, &None, &0, &token, &deadline, &desc(&env),
    );
    assert_eq!(result, Err(Ok(EscrowError::InvalidAmount)));
}

#[test]
fn create_escrow_rejects_same_buyer_and_seller() {
    let (env, client, buyer, _seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let result = client.try_create_escrow(
        &buyer, &buyer, &None, &100, &token, &deadline, &desc(&env),
    );
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

#[test]
fn create_escrow_rejects_past_deadline() {
    let (env, client, buyer, seller, _arb, token) = setup();
    env.ledger().set_timestamp(5000);

    let result = client.try_create_escrow(
        &buyer, &seller, &None, &100, &token, &1000, &desc(&env),
    );
    assert_eq!(result, Err(Ok(EscrowError::DeadlineExpired)));
}

#[test]
fn create_escrow_rejects_arbitrator_same_as_party() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let result = client.try_create_escrow(
        &buyer, &seller, &Some(buyer.clone()), &100, &token, &deadline, &desc(&env),
    );
    assert_eq!(result, Err(Ok(EscrowError::Unauthorized)));
}

// ── happy path: create -> deposit -> submit -> approve ─────────────────────

#[test]
fn full_happy_path_releases_funds_to_seller() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;
    let token_client = token::Client::new(&env, &token);

    let id = client.create_escrow(
        &buyer, &seller, &None, &500, &token, &deadline, &desc(&env),
    );

    client.deposit(&id);
    assert_eq!(token_client.balance(&buyer), 1_000_000 - 500);

    client.submit_work(&id);
    client.approve_and_release(&id);

    assert_eq!(token_client.balance(&seller), 500);
    assert_eq!(client.get_escrow(&id).state, EscrowState::Completed);
}

// ── refund ───────────────────────────────────────────────────────────────

#[test]
fn refund_returns_funds_to_buyer_before_submission() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;
    let token_client = token::Client::new(&env, &token);

    let id = client.create_escrow(
        &buyer, &seller, &None, &300, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.refund(&id);

    assert_eq!(token_client.balance(&buyer), 1_000_000);
    assert_eq!(client.get_escrow(&id).state, EscrowState::Refunded);
}

#[test]
fn refund_fails_after_work_submitted() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let id = client.create_escrow(
        &buyer, &seller, &None, &300, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);

    let result = client.try_refund(&id);
    assert_eq!(result, Err(Ok(EscrowError::InvalidState)));
}

// ── disputes ─────────────────────────────────────────────────────────────

#[test]
fn dispute_requires_arbitrator() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let id = client.create_escrow(
        &buyer, &seller, &None, &300, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);

    let result = client.try_raise_dispute(&id, &buyer);
    assert_eq!(result, Err(Ok(EscrowError::NoArbitrator)));
}

#[test]
fn resolve_dispute_split_divides_funds() {
    let (env, client, buyer, seller, arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;
    let token_client = token::Client::new(&env, &token);

    let id = client.create_escrow(
        &buyer, &seller, &Some(arb.clone()), &1000, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);
    client.raise_dispute(&id, &buyer);
    client.resolve_dispute(&id, &Resolution::Split(70));

    assert_eq!(token_client.balance(&seller), 700);
    assert_eq!(token_client.balance(&buyer), 1_000_000 - 1000 + 300);
    assert_eq!(client.get_escrow(&id).state, EscrowState::Completed);
}

#[test]
fn resolve_dispute_rejects_invalid_split() {
    let (env, client, buyer, seller, arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let id = client.create_escrow(
        &buyer, &seller, &Some(arb.clone()), &1000, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);
    client.raise_dispute(&id, &buyer);

    let result = client.try_resolve_dispute(&id, &Resolution::Split(150));
    assert_eq!(result, Err(Ok(EscrowError::InvalidSplitPercent)));
}

// ── claim_after_deadline ─────────────────────────────────────────────────

#[test]
fn claim_after_deadline_fails_before_deadline() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;

    let id = client.create_escrow(
        &buyer, &seller, &None, &400, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);

    let result = client.try_claim_after_deadline(&id);
    assert_eq!(result, Err(Ok(EscrowError::DeadlineNotReached)));
}

#[test]
fn claim_after_deadline_succeeds_once_expired() {
    let (env, client, buyer, seller, _arb, token) = setup();
    let deadline = env.ledger().timestamp() + 1000;
    let token_client = token::Client::new(&env, &token);

    let id = client.create_escrow(
        &buyer, &seller, &None, &400, &token, &deadline, &desc(&env),
    );
    client.deposit(&id);
    client.submit_work(&id);

    env.ledger().set_timestamp(deadline + 1);
    client.claim_after_deadline(&id);

    assert_eq!(token_client.balance(&seller), 400);
    assert_eq!(client.get_escrow(&id).state, EscrowState::Completed);
}

// ── get_escrow ───────────────────────────────────────────────────────────

#[test]
fn get_escrow_fails_for_unknown_id() {
    let (_env, client, ..) = setup();
    let result = client.try_get_escrow(&999);
    assert_eq!(result, Err(Ok(EscrowError::NotFound)));
}
