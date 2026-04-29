// =============================================================================
// contract.js — On-chain contract state management
//
// All simulated data and hardcoded contracts are removed.
// Contracts are stored in localStorage keyed by wallet address so each
// user sees only their own contracts across sessions.
//
// On-chain execution is handled by stellar.js.
// This file manages the local state layer that mirrors on-chain state.
// =============================================================================

// ── Contract lifecycle states (mirrors Rust EscrowState enum) ─────────────────
export const CONTRACT_STATES = {
  AWAITING_DEPOSIT: 'AWAITING_DEPOSIT',
  ACTIVE:     'ACTIVE',
  SUBMITTED:  'SUBMITTED',
  COMPLETED:  'COMPLETED',
  DISPUTED:   'DISPUTED',
  REFUNDED:   'REFUNDED',
}

// ── Input validation helpers ──────────────────────────────────────────────────
export function isValidStellarAddress(address) {
  if (!address || typeof address !== 'string') return false
  // Stellar addresses start with G (public key) or C (contract)
  // and are 56 characters long (base32 encoded)
  const trimmed = address.trim()
  return /^[GC][A-Z2-7]{55}$/.test(trimmed)
}

export function validateContractForm(form, wallet) {
  const errors = {}
  
  // Title validation
  if (!form.title?.trim()) {
    errors.title = 'Project title is required'
  } else if (form.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters'
  } else if (form.title.trim().length > 100) {
    errors.title = 'Title must be less than 100 characters'
  }
  
  // Freelancer address validation
  if (!form.freelancer?.trim()) {
    errors.freelancer = 'Freelancer address is required'
  } else if (!isValidStellarAddress(form.freelancer)) {
    errors.freelancer = 'Invalid Stellar address. Must start with G and be 56 characters long'
  } else if (form.freelancer.trim().toUpperCase() === wallet?.trim().toUpperCase()) {
    errors.freelancer = 'Freelancer address cannot be the same as your wallet address'
  }
  
  // Amount validation
  const amount = Number(form.amount)
  if (!form.amount || isNaN(amount)) {
    errors.amount = 'Amount is required'
  } else if (amount <= 0) {
    errors.amount = 'Amount must be greater than 0'
  } else if (amount > 1000000000) {
    errors.amount = 'Amount is too large'
  }
  
  // Deadline validation
  if (!form.deadline) {
    errors.deadline = 'Deadline is required'
  } else {
    const deadlineDate = new Date(form.deadline)
    const now = new Date()
    const minDate = new Date(now.getTime() + 86400000) // 24 hours from now
    
    if (deadlineDate <= now) {
      errors.deadline = 'Deadline must be in the future'
    } else if (deadlineDate < minDate) {
      errors.deadline = 'Deadline must be at least 24 hours from now'
    }
  }
  
  // Arbitrator validation (if enabled)
  if (form.enableArbitrator) {
    if (!form.arbitrator?.trim()) {
      errors.arbitrator = 'Arbitrator address is required when arbitration is enabled'
    } else if (!isValidStellarAddress(form.arbitrator)) {
      errors.arbitrator = 'Invalid arbitrator address'
    } else if (form.arbitrator.trim().toUpperCase() === wallet?.trim().toUpperCase()) {
      errors.arbitrator = 'Arbitrator cannot be the same as your wallet address'
    } else if (form.arbitrator.trim().toUpperCase() === form.freelancer?.trim().toUpperCase()) {
      errors.arbitrator = 'Arbitrator cannot be the same as the freelancer'
    }
  }
  
  // Milestone validation (if enabled)
  if (form.enableMilestones && form.milestones?.length > 0) {
    const totalPct = form.milestones.reduce((sum, m) => sum + Number(m.pct || 0), 0)
    if (Math.abs(totalPct - 100) > 0.01) {
      errors.milestones = `Milestone percentages must total 100% (currently ${totalPct.toFixed(1)}%)`
    }
    
    form.milestones.forEach((m, i) => {
      if (!m.label?.trim()) {
        errors[`milestone_${i}_label`] = 'Milestone label is required'
      }
      if (!m.pct || Number(m.pct) <= 0) {
        errors[`milestone_${i}_pct`] = 'Percentage must be greater than 0'
      }
    })
  }
  
  return errors
}

export function validateSubmission(note, deliverables, uploadedFiles) {
  const errors = {}
  
  // At least one of: note, deliverables, or uploaded files must be provided
  const hasNote = note?.trim().length > 0
  const hasDeliverables = deliverables?.some(d => d.url?.trim().length > 0)
  const hasFiles = uploadedFiles?.length > 0
  
  if (!hasNote && !hasDeliverables && !hasFiles) {
    errors.submission = 'Please provide at least a note, a deliverable link, or upload a file'
  }
  
  // Validate deliverable URLs
  if (deliverables && deliverables.length > 0) {
    deliverables.forEach((d, i) => {
      if (d.url?.trim()) {
        try {
          new URL(d.url.trim())
        } catch {
          errors[`deliverable_${i}`] = 'Invalid URL format'
        }
      }
    })
  }
  
  return errors
}

export function validateDisputeReason(reason) {
  if (!reason?.trim()) {
    return 'Dispute reason is required'
  }
  if (reason.trim().length < 10) {
    return 'Please provide a detailed reason (at least 10 characters)'
  }
  if (reason.trim().length > 500) {
    return 'Dispute reason is too long (maximum 500 characters)'
  }
  return null
}

// ── Formatting helpers ────────────────────────────────────────────────────────
export function truncateAddr(addr = '') {
  if (!addr || addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function formatXLM(amount) {
  const n = Number(amount)
  if (isNaN(n)) return '0 XLM'
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function daysRemaining(deadline) {
  if (!deadline) return null
  const diff = new Date(deadline) - new Date()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ── localStorage persistence ──────────────────────────────────────────────────
// Contracts are stored per wallet address so each user has their own list.
// Key: tw_contracts_<walletAddress>

const CONTRACTS_KEY = (wallet) => `tw_contracts_${wallet}`

export function loadContracts(wallet) {
  if (!wallet) return []
  try {
    const raw = localStorage.getItem(CONTRACTS_KEY(wallet))
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

export function saveContracts(wallet, contracts) {
  if (!wallet) return
  try {
    localStorage.setItem(CONTRACTS_KEY(wallet), JSON.stringify(contracts))
  } catch { /* storage full */ }
}

export function addContract(wallet, contract) {
  const existing = loadContracts(wallet)
  // Also index by freelancer so freelancer can find their contracts
  const updated = [contract, ...existing.filter(c => c.id !== contract.id)]
  saveContracts(wallet, updated)
  // If freelancer is different, also save under freelancer's key
  if (contract.freelancer && contract.freelancer !== wallet) {
    const freelancerContracts = loadContracts(contract.freelancer)
    const updatedFreelancer = [contract, ...freelancerContracts.filter(c => c.id !== contract.id)]
    saveContracts(contract.freelancer, updatedFreelancer)
  }
}

export function updateContract(wallet, updated) {
  const existing = loadContracts(wallet)
  const contracts = existing.map(c => c.id === updated.id ? updated : c)
  saveContracts(wallet, contracts)
  // Sync to freelancer's storage too
  if (updated.freelancer && updated.freelancer !== wallet) {
    const fl = loadContracts(updated.freelancer)
    saveContracts(updated.freelancer, fl.map(c => c.id === updated.id ? updated : c))
  }
}

// ── Contract ID generation ────────────────────────────────────────────────────
// In production this comes from the Soroban contract's escrow_id (u64).
// We store it as "TW-<escrowId>" for display.
export function formatContractId(escrowId) {
  return `TW-${String(escrowId).padStart(6, '0')}`
}

// ── State transition helpers ──────────────────────────────────────────────────
// These update local state after a confirmed on-chain transaction.
// The txHash is stored for public verification.

export function applyDeposit(contract, txHash) {
  return {
    ...contract,
    status: CONTRACT_STATES.ACTIVE,
    depositTxHash: txHash,
    fundedAt: new Date().toISOString(),
  }
}

export function applySubmitWork(contract, txHash, note, deliverables, uploadedFiles) {
  return {
    ...contract,
    status: CONTRACT_STATES.SUBMITTED,
    submittedAt: new Date().toISOString(),
    submissionNote: note,
    deliverables,
    uploadedFiles,
    submitTxHash: txHash,
  }
}

export function applyApprove(contract, txHash) {
  return {
    ...contract,
    status: CONTRACT_STATES.COMPLETED,
    completedAt: new Date().toISOString(),
    approveTxHash: txHash,
  }
}

export function applyDispute(contract, txHash, reason) {
  return {
    ...contract,
    status: CONTRACT_STATES.DISPUTED,
    disputeReason: reason,
    disputedAt: new Date().toISOString(),
    disputeTxHash: txHash,
  }
}

export function applyResolve(contract, txHash, resolution) {
  const status = resolution === 'client' ? CONTRACT_STATES.REFUNDED : CONTRACT_STATES.COMPLETED
  return {
    ...contract,
    status,
    resolution,
    resolvedAt: new Date().toISOString(),
    resolveTxHash: txHash,
  }
}

export function applyClaim(contract, txHash) {
  return {
    ...contract,
    status: CONTRACT_STATES.COMPLETED,
    claimedAt: new Date().toISOString(),
    claimTxHash: txHash,
  }
}

export function applyRefund(contract, txHash) {
  return {
    ...contract,
    status: CONTRACT_STATES.REFUNDED,
    refundedAt: new Date().toISOString(),
    refundTxHash: txHash,
  }
}
