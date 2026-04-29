#![no_std]

use soroban_sdk::{contract, contractimpl, Env, Address, Symbol};

pub mod types;
pub mod storage;
pub mod escrow;
pub mod factory;

use crate::factory::EscrowFactory;
use crate::types::{EscrowConfig, EscrowError, Resolution};

#[contract]
pub struct TrustWorkEscrowContract;

#[contractimpl]
impl TrustWorkEscrowContract {

    pub fn create_escrow(
        env: Env,
        buyer: Address,
        seller: Address,
        arbitrator: Option<Address>,
        amount: i128,
        token: Address,
        deadline: u64,
        description: Symbol,
    ) -> Result<u64, EscrowError> {
        buyer.require_auth();
        EscrowFactory::create(&env, buyer, seller, arbitrator, amount, token, deadline, description)
    }

    pub fn deposit(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::deposit(&env, escrow_id)
    }

    pub fn submit_work(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::submit_work(&env, escrow_id)
    }

    pub fn approve_and_release(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::approve_and_release(&env, escrow_id)
    }

    pub fn refund(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::refund(&env, escrow_id)
    }

    pub fn raise_dispute(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::raise_dispute(&env, escrow_id)
    }

    pub fn resolve_dispute(env: Env, escrow_id: u64, resolution: Resolution) -> Result<(), EscrowError> {
        escrow::resolve_dispute(&env, escrow_id, resolution)
    }

    pub fn claim_after_deadline(env: Env, escrow_id: u64) -> Result<(), EscrowError> {
        escrow::claim_after_deadline(&env, escrow_id)
    }

    pub fn get_escrow(env: Env, escrow_id: u64) -> Result<EscrowConfig, EscrowError> {
        storage::load_escrow(&env, escrow_id)
    }

    pub fn escrow_count(env: Env) -> u64 {
        EscrowFactory::count(&env)
    }
}
