// =============================================================================
// storage.rs — Soroban storage abstraction layer
// =============================================================================

use soroban_sdk::{Env, Symbol, symbol_short, IntoVal, Val};
use crate::types::{EscrowConfig, EscrowError};

const KEY_COUNT: Symbol = symbol_short!("COUNT");

fn escrow_key(env: &Env, id: u64) -> Val {
    (symbol_short!("ESC"), id).into_val(env)
}

pub fn load_count(env: &Env) -> u64 {
    env.storage()
        .persistent()
        .get::<Symbol, u64>(&KEY_COUNT)
        .unwrap_or(0)
}

pub fn increment_count(env: &Env) -> u64 {
    let next = load_count(env) + 1;
    env.storage().persistent().set(&KEY_COUNT, &next);
    env.storage().persistent().extend_ttl(&KEY_COUNT, 100_000, 100_000);
    next
}

pub fn save_escrow(env: &Env, config: &EscrowConfig) {
    let key = escrow_key(env, config.id);
    env.storage().persistent().set(&key, config);
    env.storage().persistent().extend_ttl(&key, 100_000, 100_000);
}

pub fn load_escrow(env: &Env, id: u64) -> Result<EscrowConfig, EscrowError> {
    let key = escrow_key(env, id);
    env.storage()
        .persistent()
        .get::<Val, EscrowConfig>(&key)
        .ok_or(EscrowError::NotFound)
}

pub fn update_escrow(env: &Env, config: &EscrowConfig) {
    save_escrow(env, config);
}
