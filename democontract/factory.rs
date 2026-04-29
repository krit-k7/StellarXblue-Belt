// =============================================================================
// factory.rs — Escrow Factory / Generator
// =============================================================================
// The factory pattern here works as follows:
//
//   - A global counter tracks how many escrow instances have been created.
//   - Each call to `create()` increments the counter and stores a new
//     EscrowConfig keyed by that ID in Soroban persistent storage.
//   - This simulates "deploying a new contract instance" on chains like Stellar
//     where contracts cannot deploy other contracts at runtime.
//   - On chains that DO support factory deployment (e.g., CosmWasm, EVM),
//     replace `storage::save_escrow` with an actual instantiate/create2 call.
//
// MULTI-CHAIN ADAPTATION NOTE:
//   CosmWasm  → replace with `WasmMsg::Instantiate`
//   EVM       → replace with CREATE2 opcode via a factory contract
//   NEAR      → replace with `Promise::new(account).create_account()`
//   Soroban   → this file as-is (instance-based storage simulation)
// =============================================================================

use soroban_sdk::{Env, Address, Symbol};
use crate::types::{EscrowConfig, EscrowState, EscrowError};
use crate::storage;

pub struct EscrowFactory;

impl EscrowFactory {

    // ── create ────────────────────────────────────────────────────────────────
    /// Instantiate a new escrow. Validates inputs, assigns an ID, and persists.
    ///
    /// Returns the new escrow's unique ID on success.
    pub fn create(
        env: &Env,
        buyer: Address,
        seller: Address,
        arbitrator: Option<Address>,
        amount: i128,
        token: Address,
        deadline: u64,
        description: Symbol,
    ) -> Result<u64, EscrowError> {

        // ── Input validation ─────────────────────────────────────────────────
        if amount <= 0 {
            return Err(EscrowError::InvalidAmount);
        }

        // Buyer and seller must be different addresses
        if buyer == seller {
            return Err(EscrowError::Unauthorized);
        }

        // Deadline must be in the future
        let now = env.ledger().timestamp();
        if deadline <= now {
            return Err(EscrowError::DeadlineExpired);
        }

        // Arbitrator (if set) must differ from both parties
        if let Some(ref arb) = arbitrator {
            if arb == &buyer || arb == &seller {
                return Err(EscrowError::Unauthorized);
            }
        }

        // ── Assign ID ────────────────────────────────────────────────────────
        let id = storage::increment_count(env);

        // ── Build config ─────────────────────────────────────────────────────
        let config = EscrowConfig {
            id,
            buyer,
            seller,
            arbitrator,
            amount,
            token,
            deadline,
            description,
            state: EscrowState::AwaitingDeposit,
        };

        // ── Persist ──────────────────────────────────────────────────────────
        storage::save_escrow(env, &config);

        // ── Emit creation event ───────────────────────────────────────────────
        env.events().publish(
            (soroban_sdk::symbol_short!("factory"), soroban_sdk::symbol_short!("created")),
            id,
        );

        Ok(id)
    }

    // ── count ─────────────────────────────────────────────────────────────────
    /// Returns the total number of escrow instances ever created.
    pub fn count(env: &Env) -> u64 {
        storage::load_count(env)
    }
}
