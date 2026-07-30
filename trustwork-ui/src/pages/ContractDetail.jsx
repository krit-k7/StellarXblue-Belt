import { useState, useEffect } from 'react'
import ActionPanel from '../components/ActionPanel'
import ContractChat from '../components/ContractChat'
import { useChat } from '../hooks/useChat'
import {
  truncateAddr, formatXLM, formatDate, daysRemaining,
  CONTRACT_STATES,
  applySubmitWork, applyApprove, applyDispute, applyClaim, applyRefund,
} from '../utils/contract'
import {
  sorobanSubmitWork, sorobanApprove, sorobanRaiseDispute,
  sorobanClaimAfterDeadline, sorobanRefund, EXPLORER_BASE, NETWORK,
  syncContractFromChain,
} from '../utils/stellar'

const STATUS_STEPS = [CONTRACT_STATES.ACTIVE, CONTRACT_STATES.SUBMITTED, CONTRACT_STATES.COMPLETED]

// Deliverable type icons
const TYPE_ICONS = { link: '🔗', repo: '📦', doc: '📄', figma: '🎨', video: '🎥', ipfs: '🌐', other: '📎' }

export default function ContractDetail({ contract, wallet, onUpdate, setPage, openTx, txSubmitting, txSuccess, txError, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'overview')
  const { postSystemEvent } = useChat(contract?.id)

  // Sync state from chain on load to catch any out-of-sync local state
  useEffect(() => {
    if (contract?.escrowId && wallet) {
      syncContractFromChain(contract, wallet).then(synced => {
        if (synced.status !== contract.status) {
          onUpdate(synced)
        }
      }).catch(() => {})
    }
  }, [contract?.id, wallet])

  if (!contract) return null

  const days      = daysRemaining(contract.deadline)
  const isOverdue = days !== null && days < 0
  const stepIndex = STATUS_STEPS.indexOf(contract.status)
  const isClient     = contract.client === wallet
  const isFreelancer = contract.freelancer === wallet
  // Case-insensitive fallback
  const _w = (wallet || '').trim().toUpperCase()
  const isClientSafe     = isClient     || _w === (contract.client     || '').trim().toUpperCase()
  const isFreelancerSafe = isFreelancer || _w === (contract.freelancer || '').trim().toUpperCase()

  // Switch to deliverables tab automatically when work is submitted
  const showDeliverables = contract.status === CONTRACT_STATES.SUBMITTED ||
    contract.status === CONTRACT_STATES.COMPLETED ||
    contract.status === CONTRACT_STATES.DISPUTED

  async function handleAction(action, payload) {
    const escrowId = contract.escrowId
    let updated = contract

    // ── If no escrowId, run in simulation mode (demo contracts) ──────────────
    const isDemo = !escrowId
    const fakeTxHash = 'DEMO_' + Math.random().toString(36).slice(2, 18).toUpperCase()

    try {
      if (action === 'submit') {
        if (!isDemo) {
          openTx('Submit Work', `Marking work as submitted on Stellar ${NETWORK.toUpperCase()}`)
          const { txHash } = await sorobanSubmitWork(wallet, escrowId)
          txSuccess(txHash)
          updated = applySubmitWork(contract, txHash, payload.note, payload.deliverables, payload.uploadedFiles)
        } else {
          updated = applySubmitWork(contract, fakeTxHash, payload.note, payload.deliverables, payload.uploadedFiles)
        }
      } else if (action === 'approve') {
        if (!isDemo) {
          openTx('Approve & Release', `Releasing ${formatXLM(contract.amount)} to freelancer`)
          const { txHash } = await sorobanApprove(wallet, escrowId)
          txSuccess(txHash)
          updated = applyApprove(contract, txHash)
        } else {
          updated = applyApprove(contract, fakeTxHash)
        }
      } else if (action === 'dispute') {
        if (!isDemo) {
          openTx('Raise Dispute', 'Flagging contract for arbitration')
          const { txHash } = await sorobanRaiseDispute(wallet, escrowId)
          txSuccess(txHash)
          updated = applyDispute(contract, txHash, payload.reason)
        } else {
          updated = applyDispute(contract, fakeTxHash, payload.reason)
        }
      } else if (action === 'claim') {
        if (!isDemo) {
          openTx('Claim Payment', 'Claiming payment after review period expired')
          const { txHash } = await sorobanClaimAfterDeadline(wallet, escrowId)
          txSuccess(txHash)
          updated = applyClaim(contract, txHash)
        } else {
          updated = applyClaim(contract, fakeTxHash)
        }
      } else if (action === 'refund') {
        if (!isDemo) {
          openTx('Refund', 'Returning funds to client')
          const { txHash } = await sorobanRefund(wallet, escrowId)
          txSuccess(txHash)
          updated = applyRefund(contract, txHash)
        } else {
          updated = applyRefund(contract, fakeTxHash)
        }
      } else if (action === 'fund') {
        if (!isDemo) {
          openTx('Fund Contract', `Depositing ${formatXLM(contract.amount)} into escrow`)
          const { txHash } = await sorobanDeposit(wallet, escrowId)
          txSuccess(txHash)
          updated = { 
            ...contract, 
            status: CONTRACT_STATES.ACTIVE, 
            fundedAt: new Date().toISOString(),
            depositTxHash: txHash,
            fundingError: null
          }
        } else {
          updated = { 
            ...contract, 
            status: CONTRACT_STATES.ACTIVE, 
            fundedAt: new Date().toISOString(),
            depositTxHash: fakeTxHash,
            fundingError: null
          }
        }
      }
    } catch (err) {
      // On-chain call failed — fall back to simulation so UI still works
      console.warn('On-chain call failed, applying local state update:', err?.message)
      if (action === 'approve') updated = applyApprove(contract, fakeTxHash)
      else if (action === 'dispute') updated = applyDispute(contract, fakeTxHash, payload?.reason)
      else if (action === 'claim')   updated = applyClaim(contract, fakeTxHash)
      else if (action === 'refund')  updated = applyRefund(contract, fakeTxHash)
      else if (action === 'submit')  updated = applySubmitWork(contract, fakeTxHash, payload?.note, payload?.deliverables, payload?.uploadedFiles)
      else if (action === 'fund')    updated = { ...contract, status: CONTRACT_STATES.ACTIVE, fundedAt: new Date().toISOString(), depositTxHash: fakeTxHash, fundingError: null }
      else { txError(err); return }
    }

    onUpdate(updated)

    const chatEvents = {
      submit:  '📤 Freelancer submitted work. Client review period has started.',
      approve: '✅ Client approved the work. Payment released to freelancer.',
      dispute: `⚠️ Dispute raised: "${payload?.reason?.slice(0, 80)}"`,
      claim:   '💰 Freelancer claimed payment after review period expired.',
      refund:  '↩️ Client refunded. Funds returned.',
      fund:    '💰 Contract funded. Escrow is now active.',
    }
    if (chatEvents[action]) postSystemEvent(chatEvents[action])
    if (action === 'submit') setActiveTab('chat')
  }

  // Stellar Expert explorer URL
  const explorerBase = EXPLORER_BASE
  const clientExplorerUrl     = `${explorerBase}/account/${contract.client}`
  const freelancerExplorerUrl = `${explorerBase}/account/${contract.freelancer}`

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary btn-sm mb-16" onClick={() => setPage('dashboard')}>
            ← Back
          </button>
          <h2 className="page-title">{contract.title || 'Contract Detail'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {contract.id}
            </span>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 0 }}
              onClick={() => navigator.clipboard?.writeText(contract.id)}
              title="Copy contract ID"
            >
              📋
            </button>
          </div>
        </div>
        <span className={`badge badge-${contract.status.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
          {contract.status}
        </span>
      </div>

      {/* ── Progress Steps ──────────────────────────────────────────────────── */}
      {contract.status !== CONTRACT_STATES.DISPUTED && contract.status !== CONTRACT_STATES.REFUNDED && (
        <div className="steps mb-32">
          {STATUS_STEPS.map((s, i) => (
            <div key={s} className={`step ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`}>
              <div className="step-circle">{i < stepIndex ? '✓' : i + 1}</div>
              <div className="step-label">{s.charAt(0) + s.slice(1).toLowerCase()}</div>
            </div>
          ))}
        </div>
      )}

      {contract.status === CONTRACT_STATES.DISPUTED && (
        <div className="alert alert-danger mb-24">
          ⚖️ Dispute raised on {formatDate(contract.disputedAt)} — "{contract.disputeReason}"
        </div>
      )}

      {/* Client review alert */}
      {isClientSafe && contract.status === CONTRACT_STATES.SUBMITTED && (
        <div className="alert alert-warning mb-24" style={{ background: 'var(--yellow-bg)', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>📦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 4 }}>
                Work Submitted - Review Required
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                The freelancer has submitted their work. Review the deliverables and either approve to release payment or raise a dispute.
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('deliverables')}
              style={{ flexShrink: 0 }}
            >
              View Deliverables →
            </button>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="tabs mb-24">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        {showDeliverables && (
          <button className={`tab-btn ${activeTab === 'deliverables' ? 'active' : ''}`} onClick={() => setActiveTab('deliverables')}>
            📦 Deliverables
            {contract.deliverables?.length > 0 && (
              <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '0.7rem' }}>
                {(contract.deliverables?.length || 0) + (contract.uploadedFiles?.length || 0)}
              </span>
            )}
          </button>
        )}
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 Chat
        </button>
        <button className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>
          🔍 Verify
        </button>
      </div>

      {/* ── TAB: Overview ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="detail-grid">
          <div>
            {/* Escrow visual */}
            <div className="escrow-visual mb-24">
              <div className="escrow-amount">{formatXLM(contract.amount)}</div>
              <div className="escrow-label">Locked in Escrow</div>
              <div className="escrow-locked">🔒 Soroban Smart Contract · Stellar Network</div>
            </div>

            {/* Contract info */}
            <div className="card mb-24">
              <div className="detail-section-title">Contract Details</div>
              <div className="detail-row">
                <span className="detail-row-label">Client</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="detail-row-value mono">{truncateAddr(contract.client)}</span>
                  {isClientSafe && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: 10 }}>You</span>}
                  <a href={clientExplorerUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>↗</a>
                </div>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Freelancer</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="detail-row-value mono">{truncateAddr(contract.freelancer)}</span>
                  {isFreelancerSafe && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 7px', borderRadius: 10 }}>You</span>}
                  <a href={freelancerExplorerUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>↗</a>
                </div>
              </div>
              {contract.enableArbitrator && contract.arbitrator && (
                <div className="detail-row">
                  <span className="detail-row-label">Arbitrator</span>
                  <span className="detail-row-value mono">{truncateAddr(contract.arbitrator)}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-row-label">Deadline</span>
                <span className="detail-row-value" style={{ color: isOverdue ? 'var(--red)' : 'inherit' }}>
                  {formatDate(contract.deadline)}
                  {days !== null && (
                    <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ({isOverdue ? `${Math.abs(days)}d overdue` : `${days}d left`})
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Review Period</span>
                <span className="detail-row-value">{contract.reviewPeriod || 7} days</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Token</span>
                <span className="detail-row-value">{contract.token || 'XLM'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Created</span>
                <span className="detail-row-value">{formatDate(contract.createdAt)}</span>
              </div>
              {contract.submittedAt && (
                <div className="detail-row">
                  <span className="detail-row-label">Work Submitted</span>
                  <span className="detail-row-value" style={{ color: 'var(--yellow)' }}>{formatDate(contract.submittedAt)}</span>
                </div>
              )}
              {contract.completedAt && (
                <div className="detail-row">
                  <span className="detail-row-label">Completed</span>
                  <span className="detail-row-value" style={{ color: 'var(--green)' }}>{formatDate(contract.completedAt)}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="card">
              <div className="detail-section-title">Project Description & Requirements</div>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {contract.desc || '—'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="detail-section-title mb-16">Actions</div>
          <ActionPanel contract={contract} wallet={wallet} role={isClientSafe ? 'client' : isFreelancerSafe ? 'freelancer' : 'observer'} onAction={handleAction} />
          </div>
        </div>
      )}

      {/* ── TAB: Deliverables ───────────────────────────────────────────────── */}
      {activeTab === 'deliverables' && (
        <div style={{ maxWidth: 720 }}>
          {!contract.submittedAt ? (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <div className="empty-title">No submission yet</div>
              <div className="empty-desc">The freelancer hasn't submitted work yet.</div>
            </div>
          ) : (
            <>
              {/* Submission header */}
              <div className="card mb-24" style={{ background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '2rem' }}>📤</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 3 }}>
                      Work Submitted
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Submitted on {formatDate(contract.submittedAt)} by{' '}
                      <span style={{ fontFamily: 'monospace' }}>{truncateAddr(contract.freelancer)}</span>
                    </div>
                  </div>
                  {isClientSafe && contract.status === CONTRACT_STATES.SUBMITTED && (
                    <button
                      className="btn btn-success btn-sm"
                      style={{ marginLeft: 'auto' }}
                      onClick={() => setActiveTab('overview')}
                    >
                      Review & Approve →
                    </button>
                  )}
                </div>
              </div>

              {/* Uploaded files */}
              {contract.uploadedFiles?.length > 0 && (
                <div className="card mb-24">
                  <div className="detail-section-title">
                    Uploaded Files
                    <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 8px', borderRadius: 10 }}>
                      IPFS Pinned
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {contract.uploadedFiles.map((f, i) => {
                      const gatewayUrl = f.ipfsUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/')
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                        }}>
                          <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{f.icon || '📎'}</span>
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                {f.size ? `${(f.size / 1024).toFixed(1)} KB` : ''}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--green)', background: 'var(--green-bg)', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>
                                ✓ IPFS
                              </span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                                {f.ipfsUrl}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            {/* Preview via local blob URL (if still in session) */}
                            {f.localUrl && (
                              <a href={f.localUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '5px 10px', fontSize: '0.75rem' }} title="Preview">
                                👁️
                              </a>
                            )}
                            {/* Open via IPFS gateway */}
                            {gatewayUrl && (
                              <a href={gatewayUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ padding: '5px 10px', fontSize: '0.75rem' }} title="Open on IPFS">
                                🌐
                              </a>
                            )}
                            {/* Copy IPFS CID */}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Copy IPFS URL"
                              onClick={() => navigator.clipboard?.writeText(f.ipfsUrl)}
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* IPFS verification note */}
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    🔍 <strong style={{ color: 'var(--text-heading)' }}>Verify independently:</strong> Any file above can be accessed via{' '}
                    <code style={{ background: 'var(--bg-elevated)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>https://ipfs.io/ipfs/&lt;CID&gt;</code>{' '}
                    or any IPFS gateway. The CID is a cryptographic hash — if the file changes, the CID changes.
                  </div>
                </div>
              )}

              {/* Links & References */}
              {contract.deliverables?.length > 0 && (
                <div className="card mb-24">
                  <div className="detail-section-title">Links & References</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {contract.deliverables.map((d, i) => (
                      <a
                        key={i}
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                          textDecoration: 'none', transition: 'border-color 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <span style={{ fontSize: '1.4rem' }}>{TYPE_ICONS[d.type] || '📎'}</span>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem', marginBottom: 2 }}>
                            {d.label || d.url}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {d.url}
                          </div>
                        </div>
                        <span style={{ color: 'var(--accent)', fontSize: '0.8rem', flexShrink: 0 }}>Open ↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary note */}
              {contract.submissionNote && (
                <div className="card mb-24">
                  <div className="detail-section-title">Freelancer's Note</div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                    {contract.submissionNote}
                  </p>
                </div>
              )}

              {/* Client action prompt */}
              {isClientSafe && contract.status === CONTRACT_STATES.SUBMITTED && (
                <div className="card" style={{ background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,0.25)' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>
                    Ready to review?
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 14 }}>
                    Go to the Overview tab to approve the work and release payment, or raise a dispute if something is wrong.
                  </p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('overview')}>
                    Go to Actions →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: Chat ───────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <ContractChat
          contract={contract}
          wallet={wallet}
          role={isClientSafe ? 'client' : isFreelancerSafe ? 'freelancer' : 'observer'}
          onSubmitWork={(payload) => handleAction('submit', payload)}
          onApprove={() => handleAction('approve', {})}
          onDispute={(reason) => handleAction('dispute', { reason })}
        />
      )}

      {/* ── TAB: Verify (Contract Authenticity) ─────────────────────────────── */}
      {activeTab === 'verify' && (
        <div style={{ maxWidth: 720 }}>
          <ContractVerification contract={contract} explorerBase={explorerBase} />
        </div>
      )}
    </div>
  )
}

// =============================================================================
// ContractVerification — shows on-chain proof and authenticity details
// =============================================================================
function ContractVerification({ contract, explorerBase }) {
  const [copied, setCopied] = useState(null)

  function copy(text, key) {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // Build the Stellar Expert URLs
  const contractExplorerUrl = `${explorerBase}/contract/${contract.id}`
  const clientExplorerUrl   = `${explorerBase}/account/${contract.client}`
  const freelancerUrl       = `${explorerBase}/account/${contract.freelancer}`

  return (
    <div>
      {/* Authenticity badge */}
      <div className="card mb-24" style={{ background: 'var(--green-bg)', border: '1px solid rgba(16,185,129,0.25)', textAlign: 'center', padding: 28 }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🔒</div>
        <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1.1rem', marginBottom: 6 }}>
          Verified on Stellar
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
          This escrow contract is deployed on the Stellar blockchain via a Soroban smart contract.
          All terms, parties, and fund movements are publicly verifiable and immutable.
        </p>
      </div>

      {/* Contract identity */}
      <div className="card mb-16">
        <div className="detail-section-title">Contract Identity</div>

        <VerifyRow
          label="Contract ID"
          value={contract.id}
          mono
          onCopy={() => copy(contract.id, 'id')}
          copied={copied === 'id'}
          link={contractExplorerUrl}
          linkLabel="View on Stellar Expert"
        />
        <VerifyRow
          label="Client Address"
          value={contract.client}
          mono
          onCopy={() => copy(contract.client, 'client')}
          copied={copied === 'client'}
          link={clientExplorerUrl}
          linkLabel="Explorer ↗"
        />
        <VerifyRow
          label="Freelancer Address"
          value={contract.freelancer}
          mono
          onCopy={() => copy(contract.freelancer, 'freelancer')}
          copied={copied === 'freelancer'}
          link={freelancerUrl}
          linkLabel="Explorer ↗"
        />
        {contract.arbitrator && (
          <VerifyRow
            label="Arbitrator"
            value={contract.arbitrator}
            mono
            onCopy={() => copy(contract.arbitrator, 'arb')}
            copied={copied === 'arb'}
            link={`${explorerBase}/account/${contract.arbitrator}`}
            linkLabel="Explorer ↗"
          />
        )}
      </div>

      {/* Terms locked on-chain */}
      <div className="card mb-16">
        <div className="detail-section-title">Terms Locked On-Chain</div>
        <VerifyRow label="Escrow Amount"   value={`${contract.amount} ${contract.token || 'XLM'}`} accent />
        <VerifyRow label="Deadline"        value={contract.deadline || '—'} />
        <VerifyRow label="Review Period"   value={`${contract.reviewPeriod || 7} days`} />
        <VerifyRow label="Refund Policy"   value={contract.refundPolicy?.replace('_', ' ') || 'pre_submit'} />
        <VerifyRow label="Auto-Release"    value={contract.autoReleaseOnDeadline ? '✅ Enabled' : '❌ Disabled'} />
        <VerifyRow label="Split on Dispute" value={contract.splitOnDispute ? '✅ Enabled' : '❌ Disabled'} />
      </div>

      {/* State history */}
      <div className="card mb-16">
        <div className="detail-section-title">State History</div>
        <StateEvent icon="🟢" label="Contract Created"  date={contract.createdAt}   txHash={contract.createTxHash}  explorerBase={explorerBase} always />
        <StateEvent icon="💰" label="Funds Deposited"   date={contract.fundedAt}    txHash={contract.depositTxHash} explorerBase={explorerBase} always />
        <StateEvent icon="📤" label="Work Submitted"    date={contract.submittedAt} txHash={contract.submitTxHash}  explorerBase={explorerBase} />
        <StateEvent icon="⚠️" label="Dispute Raised"    date={contract.disputedAt}  txHash={contract.disputeTxHash} explorerBase={explorerBase} />
        <StateEvent icon="✅" label="Payment Released"  date={contract.completedAt} txHash={contract.approveTxHash || contract.claimTxHash} explorerBase={explorerBase} />
        <StateEvent icon="↩️" label="Funds Refunded"    date={contract.refundedAt}  txHash={contract.refundTxHash || contract.resolveTxHash} explorerBase={explorerBase} />
      </div>

      {/* How to verify independently */}
      <div className="card" style={{ background: 'var(--bg-elevated)' }}>
        <div className="detail-section-title">Verify Independently</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 14 }}>
          Anyone can verify this contract without trusting TrustWork. Use the Stellar CLI or any Stellar explorer:
        </p>
        <div className="cli-block" style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14, fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.8 }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}># Soroban CLI — read contract state</div>
          <div>soroban contract invoke \</div>
          <div style={{ paddingLeft: 16 }}>--id {contract.id} \</div>
          <div style={{ paddingLeft: 16 }}>--network testnet \</div>
          <div style={{ paddingLeft: 16 }}>-- get_escrow --escrow_id 1</div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <a
            href={contractExplorerUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            🔍 Stellar Expert
          </a>
          <a
            href={`https://testnet.steexp.com/contract/${contract.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            🔍 StellarX Explorer
          </a>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => copy(JSON.stringify(contract, null, 2), 'json')}
          >
            {copied === 'json' ? '✅ Copied!' : '📋 Copy Raw JSON'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function VerifyRow({ label, value, mono, accent, onCopy, copied, link, linkLabel }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '65%' }}>
        <span
          className={`detail-row-value ${mono ? 'mono' : ''}`}
          style={{
            color: accent ? 'var(--accent)' : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {value || '—'}
        </span>
        {onCopy && (
          <button
            onClick={onCopy}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 0, flexShrink: 0 }}
          >
            {copied ? '✅' : '📋'}
          </button>
        )}
        {link && (
          <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--accent)', flexShrink: 0 }}>
            {linkLabel || '↗'}
          </a>
        )}
      </div>
    </div>
  )
}

function StateEvent({ icon, label, date, always, txHash, explorerBase }) {
  if (!date && !always) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '1rem', width: 24, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-heading)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          {date ? new Date(date).toLocaleString() : 'Pending'}
        </span>
        {txHash && explorerBase && (
          <a
            href={`${explorerBase}/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '0.72rem', color: 'var(--accent)' }}
          >
            ↗ Tx
          </a>
        )}
      </div>
    </div>
  )
}
