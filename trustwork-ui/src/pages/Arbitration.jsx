import { useState } from 'react'
import { truncateAddr, formatXLM, formatDate, CONTRACT_STATES, applyResolve } from '../utils/contract'
import { sorobanResolveDispute, NETWORK } from '../utils/stellar'

export default function Arbitration({ contracts, onUpdate, wallet, openTx, txSubmitting, txSuccess, txError }) {
  const disputed = contracts.filter(c => c.status === CONTRACT_STATES.DISPUTED)
  const resolved = contracts.filter(c =>
    c.resolution && (c.status === CONTRACT_STATES.COMPLETED || c.status === CONTRACT_STATES.REFUNDED)
  )

  const [loading, setLoading] = useState(null)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('pending')

  async function handleResolve(contract, resolution) {
    setLoading(contract.id + resolution)
    try {
      openTx('Resolve Dispute', `Resolving dispute for ${contract.title}`)
      const { txHash } = await sorobanResolveDispute(wallet, contract.escrowId, resolution)
      txSuccess(txHash)
      onUpdate(applyResolve(contract, txHash, resolution))
    } catch (err) {
      txError(err)
    } finally {
      setLoading(null)
      setSelected(null)
    }
  }

  const ResolutionModal = ({ contract }) => (
    <div className="modal-overlay" onClick={() => setSelected(null)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">⚖️ Resolve Dispute</div>
        <div className="modal-desc">
          Review the case and choose a resolution for contract <strong>{contract.id}</strong>.
        </div>

        <div className="card mb-16" style={{ padding: 16 }}>
          <div className="detail-section-title">Dispute Reason</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{contract.disputeReason}</p>
        </div>

        <div className="arb-card-parties">
          <div className="arb-party">
            <div className="arb-party-role">Client</div>
            <div className="arb-party-addr">{truncateAddr(contract.client)}</div>
          </div>
          <div className="arb-vs">VS</div>
          <div className="arb-party">
            <div className="arb-party-role">Freelancer</div>
            <div className="arb-party-addr">{truncateAddr(contract.freelancer)}</div>
          </div>
        </div>

        <div className="modal-actions" style={{ flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-success btn-full"
            onClick={() => handleResolve(contract, 'freelancer')}
            disabled={!!loading}
          >
            {loading === contract.id + 'freelancer' ? '⏳...' : `✅ Release to Freelancer (${formatXLM(contract.amount)})`}
          </button>
          <button
            className="btn btn-danger btn-full"
            onClick={() => handleResolve(contract, 'client')}
            disabled={!!loading}
          >
            {loading === contract.id + 'client' ? '⏳...' : `↩️ Refund Client (${formatXLM(contract.amount)})`}
          </button>
          <button
            className="btn btn-warning btn-full"
            onClick={() => handleResolve(contract, 'split')}
            disabled={!!loading}
          >
            {loading === contract.id + 'split' ? '⏳...' : `⚡ Split 50/50 (${formatXLM(contract.amount / 2)} each)`}
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => setSelected(null)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="mb-32">
        <h2 className="page-title">Arbitration</h2>
        <p className="page-subtitle">Review and resolve disputed contracts</p>
      </div>

      <div className="tabs mb-24">
        <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          Pending {disputed.length > 0 && <span style={{ marginLeft: 6, color: 'var(--red)', fontSize: '0.75rem' }}>{disputed.length}</span>}
        </button>
        <button className={`tab-btn ${tab === 'resolved' ? 'active' : ''}`} onClick={() => setTab('resolved')}>
          Resolved
        </button>
      </div>

      {tab === 'pending' && (
        <>
          {disputed.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚖️</div>
              <div className="empty-title">No pending disputes</div>
              <div className="empty-desc">All contracts are running smoothly.</div>
            </div>
          ) : (
            <div className="arb-grid">
              {disputed.map(c => (
                <div className="card" key={c.id}>
                  <div className="flex-between mb-16">
                    <div>
                      <div className="contract-card-title">{c.title}</div>
                      <div className="contract-card-addr">{c.id}</div>
                    </div>
                    <span className="badge badge-disputed">DISPUTED</span>
                  </div>

                  <div className="arb-card-parties">
                    <div className="arb-party">
                      <div className="arb-party-role">Client</div>
                      <div className="arb-party-addr">{truncateAddr(c.client)}</div>
                    </div>
                    <div className="arb-vs">VS</div>
                    <div className="arb-party">
                      <div className="arb-party-role">Freelancer</div>
                      <div className="arb-party-addr">{truncateAddr(c.freelancer)}</div>
                    </div>
                  </div>

                  <div className="detail-row">
                    <span className="detail-row-label">Amount at Stake</span>
                    <span className="detail-row-value" style={{ color: 'var(--accent)' }}>{formatXLM(c.amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Disputed On</span>
                    <span className="detail-row-value">{formatDate(c.disputedAt)}</span>
                  </div>

                  <div className="card" style={{ background: 'var(--red-bg)', border: '1px solid rgba(239,68,68,0.2)', padding: 12, margin: '12px 0' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>DISPUTE REASON</div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text)' }}>{c.disputeReason}</p>
                  </div>

                  <button className="btn btn-primary btn-full" onClick={() => setSelected(c)}>
                    ⚖️ Resolve Dispute
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'resolved' && (
        <>
          {resolved.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <div className="empty-title">No resolved disputes yet</div>
            </div>
          ) : (
            <div className="arb-grid">
              {resolved.map(c => (
                <div className="card" key={c.id}>
                  <div className="flex-between mb-16">
                    <div>
                      <div className="contract-card-title">{c.title}</div>
                      <div className="contract-card-addr">{c.id}</div>
                    </div>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Resolution</span>
                    <span className="detail-row-value" style={{ textTransform: 'capitalize' }}>
                      {c.resolution === 'freelancer' ? '✅ Released to Freelancer'
                        : c.resolution === 'client' ? '↩️ Refunded to Client'
                        : '⚡ Split 50/50'}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Amount</span>
                    <span className="detail-row-value">{formatXLM(c.amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-row-label">Resolved On</span>
                    <span className="detail-row-value">{formatDate(c.resolvedAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selected && <ResolutionModal contract={selected} />}
    </div>
  )
}
