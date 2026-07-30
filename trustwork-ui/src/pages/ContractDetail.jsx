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
const TYPE_ICONS = { link: '🔗', repo: '📦', doc: '📄', figma: '🎨', video: '🎥', ipfs: '🌐', other: '📎' }

export default function ContractDetail({ contract, wallet, onUpdate, setPage, openTx, txSubmitting, txSuccess, txError, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'overview')
  const { postSystemEvent } = useChat(contract?.id)

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
  const _w = (wallet || '').trim().toUpperCase()
  const isClientSafe     = isClient     || _w === (contract.client     || '').trim().toUpperCase()
  const isFreelancerSafe = isFreelancer || _w === (contract.freelancer || '').trim().toUpperCase()

  const showDeliverables = contract.status === CONTRACT_STATES.SUBMITTED ||
    contract.status === CONTRACT_STATES.COMPLETED ||
    contract.status === CONTRACT_STATES.DISPUTED

  async function handleAction(action, payload) {
    const escrowId = contract.escrowId
    let updated = contract
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
      }
    } catch (err) {
      console.warn('Action failed:', err?.message)
      txError(err)
      return
    }

    onUpdate(updated)

    const chatEvents = {
      submit:  '📤 Freelancer submitted work. Client review period has started.',
      approve: '✅ Client approved the work. Payment released to freelancer.',
      dispute: `⚠️ Dispute raised: "${payload?.reason?.slice(0, 80)}"`,
      claim:   '💰 Freelancer claimed payment after review period expired.',
      refund:  '↩️ Client refunded. Funds returned.',
    }
    if (chatEvents[action]) postSystemEvent(chatEvents[action])
    if (action === 'submit') setActiveTab('chat')
  }

  const explorerBase = EXPLORER_BASE
  const clientExplorerUrl     = `${explorerBase}/account/${contract.client}`
  const freelancerExplorerUrl = `${explorerBase}/account/${contract.freelancer}`

  return (
    <div className="page">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex-between mb-48" style={{ alignItems: 'flex-start' }}>
        <div>
          <button className="btn btn-secondary btn-sm mb-24" onClick={() => setPage('dashboard')}>
            ← Back to Dashboard
          </button>
          <h2 className="page-title">{contract.title || 'Contract Detail'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)', background: 'var(--bg-sunken)', padding: '4px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {contract.id}
            </span>
            <button
              style={{ background: 'var(--overlay-1)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '4px 8px' }}
              onClick={() => navigator.clipboard?.writeText(contract.id)}
            >
              Copy
            </button>
          </div>
        </div>
        <span className={`badge badge-${contract.status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '8px 20px' }}>
          {contract.status}
        </span>
      </div>

      {/* ── Progress Steps ──────────────────────────────────────────────────── */}
      {contract.status !== CONTRACT_STATES.DISPUTED && contract.status !== CONTRACT_STATES.REFUNDED && (
        <div className="card mb-48" style={{ padding: '24px 40px', background: 'var(--bg-sunken)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {/* Line background */}
            <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '2px', background: 'var(--border-strong)', zIndex: 0 }} />
            
            {STATUS_STEPS.map((s, i) => {
              const isDone = i < stepIndex
              const isCurrent = i === stepIndex
              return (
                <div key={s} style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '80px' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 12px',
                    background: isDone || isCurrent ? 'var(--grad-primary)' : 'var(--bg-card)',
                    border: `2px solid ${isDone || isCurrent ? 'transparent' : 'var(--border-strong)'}`,
                    color: isDone || isCurrent ? 'var(--accent-ink)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justify_content: 'center', fontWeight: '800'
                  }}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', fontWeight: '700', 
                    color: isCurrent ? 'var(--text-heading)' : 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}>
                    {s.toLowerCase()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {contract.status === CONTRACT_STATES.DISPUTED && (
        <div className="card mb-48" style={{ background: 'var(--red-bg)', border: '1px solid var(--red)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: '2rem' }}>⚖️</span>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>Dispute in Progress</div>
              <div style={{ fontSize: '0.95rem', color: 'var(--text)', marginTop: 4 }}>
                Raised on {formatDate(contract.disputedAt)}: "{contract.disputeReason}"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="tabs mb-32">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        {showDeliverables && (
          <button className={`tab-btn ${activeTab === 'deliverables' ? 'active' : ''}`} onClick={() => setActiveTab('deliverables')}>
            📦 Deliverables
            {contract.deliverables?.length > 0 && (
              <span style={{ marginLeft: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: '0.75rem', fontWeight: '800' }}>
                {(contract.deliverables?.length || 0) + (contract.uploadedFiles?.length || 0)}
              </span>
            )}
          </button>
        )}
        <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
          💬 Workspace
        </button>
        <button className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>
          🔍 Verification
        </button>
      </div>

      {/* ── TAB: Overview ───────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div className="escrow-visual">
              <div className="escrow-amount">{formatXLM(contract.amount)}</div>
              <div className="escrow-label">Funds Secured in Escrow</div>
              <div className="escrow-locked">🔒 Verified Soroban Smart Contract</div>
            </div>

            <div className="card">
              <h3 className="mb-24">Contract Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <DetailRow label="Client" value={truncateAddr(contract.client)} mono isUser={isClientSafe} url={clientExplorerUrl} />
                <DetailRow label="Freelancer" value={truncateAddr(contract.freelancer)} mono isUser={isFreelancerSafe} url={freelancerExplorerUrl} />
                <DetailRow label="Deadline" value={formatDate(contract.deadline)} warn={isOverdue} />
                <DetailRow label="Review Period" value={`${contract.reviewPeriod || 7} Days`} />
                <DetailRow label="Network" value={NETWORK.toUpperCase()} />
              </div>
            </div>

            <div className="card">
              <h3 className="mb-16">Description</h3>
              <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                {contract.desc || 'No description provided.'}
              </p>
            </div>
          </div>

          <div>
            <h3 className="mb-24">Actions</h3>
            <ActionPanel 
              contract={contract} 
              wallet={wallet} 
              role={isClientSafe ? 'client' : isFreelancerSafe ? 'freelancer' : 'observer'} 
              onAction={handleAction} 
            />
          </div>
        </div>
      )}

      {/* ── TAB: Deliverables ───────────────────────────────────────────────── */}
      {activeTab === 'deliverables' && (
        <div style={{ maxWidth: 800 }}>
          {!contract.submittedAt ? (
            <div className="card" style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>📦</div>
              <h3>Awaiting Submission</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>The freelancer has not submitted any deliverables yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontSize: '2.5rem' }}>📤</div>
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>Work Submitted</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Delivered on {formatDate(contract.submittedAt)}
                    </div>
                  </div>
                </div>
              </div>

              {contract.uploadedFiles?.length > 0 && (
                <div className="card">
                  <h3 className="mb-24">Secure IPFS Files</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {contract.uploadedFiles.map((f, i) => (
                      <div key={i} className="card" style={{ background: 'var(--bg-sunken)', padding: '16px', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: '2rem' }}>{f.icon || '📄'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{f.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {f.size ? `${(f.size / 1024).toFixed(1)} KB` : ''} · IPFS Secured
                          </div>
                        </div>
                        <a href={f.ipfsUrl?.replace('ipfs://', 'https://ipfs.io/ipfs/')} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {contract.deliverables?.length > 0 && (
                <div className="card">
                  <h3 className="mb-24">Project Links</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                    {contract.deliverables.map((d, i) => (
                      <a key={i} href={d.url} target="_blank" rel="noreferrer" className="card card-clickable" style={{ background: 'var(--bg-sunken)', padding: '20px', border: '1px solid var(--border-strong)' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>{TYPE_ICONS[d.type] || '🔗'}</div>
                        <div style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{d.label || 'Resource'}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.url}</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {contract.submissionNote && (
                <div className="card">
                  <h3 className="mb-16">Freelancer Note</h3>
                  <p style={{ fontSize: '1rem', lineHeight: 1.8, color: 'var(--text)' }}>{contract.submissionNote}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Chat ───────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="card" style={{ padding: 0, height: '700px', overflow: 'hidden' }}>
          <ContractChat
            contract={contract}
            wallet={wallet}
            role={isClientSafe ? 'client' : isFreelancerSafe ? 'freelancer' : 'observer'}
            onSubmitWork={(payload) => handleAction('submit', payload)}
            onApprove={() => handleAction('approve', {})}
            onDispute={(reason) => handleAction('dispute', { reason })}
          />
        </div>
      )}

      {/* ── TAB: Verify ─────────────────────────────────────────────────────── */}
      {activeTab === 'verify' && (
        <div style={{ maxWidth: 800 }}>
          <div className="card" style={{ background: 'var(--grad-primary)', color: 'var(--accent-ink)', padding: '60px 40px', textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: '4rem', marginBottom: 20 }}>🛡️</div>
            <h2 style={{ color: 'inherit' }}>Immutable Verification</h2>
            <p style={{ opacity: 0.8, fontSize: '1.1rem', marginTop: 12 }}>
              This contract is a living piece of code on the Stellar network. 
              Its terms cannot be altered, and funds can only be moved via cryptographic proof.
            </p>
          </div>

          <div className="card">
            <h3 className="mb-24">On-Chain Evidence</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <VerifyRow label="Contract Address" value={contract.id} mono url={`${explorerBase}/contract/${contract.id}`} />
              <VerifyRow label="Creation Transaction" value={contract.createTxHash} mono url={`${explorerBase}/tx/${contract.createTxHash}`} />
              {contract.depositTxHash && <VerifyRow label="Funding Transaction" value={contract.depositTxHash} mono url={`${explorerBase}/tx/${contract.depositTxHash}`} />}
              <VerifyRow label="Factory Version" value="TrustWork Soroban v6.0" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, mono, isUser, warn, url }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.9rem' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ 
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          color: warn ? 'var(--red)' : 'var(--text-heading)',
          fontWeight: '700',
          fontSize: '0.95rem'
        }}>
          {value}
        </span>
        {isUser && <span style={{ fontSize: '0.7rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontWeight: '800' }}>YOU</span>}
        {url && <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>↗</a>}
      </div>
    </div>
  )
}

function VerifyRow({ label, value, mono, url }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '16px', background: 'var(--bg-sunken)', borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)' }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ 
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          color: 'var(--text-heading)',
          fontSize: '0.9rem',
          wordBreak: 'break-all',
          paddingRight: '20px'
        }}>
          {value}
        </span>
        {url && <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>Verify ↗</a>}
      </div>
    </div>
  )
}
