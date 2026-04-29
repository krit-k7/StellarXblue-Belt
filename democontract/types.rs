// =============================================================================
// types.rs — Shared types, enums, and error codes
// =============================================================================

use soroban_sdk::{contracttype, Address, Symbol, contracterror};

// ── EscrowState ───────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum EscrowState {
    AwaitingDeposit,
    Funded,
    WorkSubmitted,
    Disputed,
    Completed,
    Refunded,
}

// ── Resolution ────────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub enum Resolution {
    ReleaseToSeller,
    RefundToBuyer,
    Split(u32),
}

// ── EscrowConfig ──────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct EscrowConfig {
    pub id:           u64,
    pub buyer:        Address,
    pub seller:       Address,
    pub arbitrator:   Option<Address>,
    pub amount:       i128,
    pub token:        Address,
    pub deadline:     u64,
    pub description:  Symbol,
    pub state:        EscrowState,
}

// ── EscrowError ───────────────────────────────────────────────────────────────
// contracterror derives Copy + the From<soroban_sdk::Error> impl automatically
#[contracterror]
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum EscrowError {
    NotFound            = 1,
    Unauthorized        = 2,
    InvalidState        = 3,
    DeadlineNotReached  = 4,
    DeadlineExpired     = 5,
    NoArbitrator        = 6,
    InvalidAmount       = 7,
    InvalidSplitPercent = 8,
    TransferFailed      = 9,
}
