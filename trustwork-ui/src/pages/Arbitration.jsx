import { useState } from 'react'
import { truncateAddr, formatXLM, formatDate, CONTRACT_STATES, applyResolve } from '../utils/contract'
import { sorobanResolveDispute, NETWORK } from '../utils/stellar'
import { ScaleIcon, ClipboardIcon } from '../components/icons'

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
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, borderRadius: '16px', background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justify_content: 'center', color: 'var(--accent-ink)' }}>
            <ScaleIcon width={28} height={28} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem' }}>Resolve Dispute</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>Contract ID: <span className="mono">{contract.id}</span></p>
          </div>
        </div>

        <div className="card mb-24" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-strong)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>Dispute Reason</div>
          <p style={{ fontSize: '1rem', color: 'var(--text-heading)', lineHeight: 1.6 }}>{contract.disputeReason}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 20, marginBottom: 32, textAlign: 'center' }}>
          <div className="card" style={{ padding: '16px', background: 'var(--overlay-1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: 4 }}>CLIENT</div>
            <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-heading)' }}>{truncateAddr(contract.client)}</div>
          </div>
          <div style={{ fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.8rem' }}>VS</div>
          <div className="card" style={{ padding: '16px', background: 'var(--overlay-1)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: 4 }}>FREELANCER</div>
            <div className="mono" style={{ fontSize: '0.85rem', color: 'var(--text-heading)' }}>{truncateAddr(contract.freelancer)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => handleResolve(contract, 'freelancer')}
            disabled={!!loading}
            style={{ background: 'var(--green)', color: '#000' }}
          >
            {loading === contract.id + 'freelancer' ? 'Processing...' : `Release to Freelancer (${formatXLM(contract.amount)})`}
          </button>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={() => handleResolve(contract, 'client')}
            disabled={!!loading}
            style={{ background: 'var(--red)', color: '#fff' }}
          >
            {loading === contract.id + 'client' ? 'Processing...' : `Refund to Client (${formatXLM(contract.amount)})`}
          </button>
          <button
            className="btn btn-outline btn-full btn-lg"
            onClick={() => handleResolve(contract, 'split')}
            disabled={!!loading}
          >
            {loading === contract.id + 'split' ? 'Processing...' : `Split 50/50 Resolution`}
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => setSelected(null)} style={{ marginTop: 8 }}>
            Cancel & Close
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="flex-between mb-48">
        <div>
          <h2 className="page-title italic-serif">Arbitration Court</h2>
          <p className="page-subtitle">Fair resolution for trustless contracts.</p>
        </div>
        <div className="tabs">
          <button className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
            Pending Cases
            {disputed.length > 0 && <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', borderRadius: 'var(--radius-pill)', padding: '2px 8px', fontSize: '0.75rem', fontWeight: '800' }}>{disputed.length}</span>}
          </button>
          <button className={`tab-btn ${tab === 'resolved' ? 'active' : ''}`} onClick={() => setTab('resolved')}>
            Resolution History
          </button>
        </div>
      </div>

      {tab === 'pending' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {disputed.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 24px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>⚖️</div>
              <h3>Clear Docket</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>All contracts are running smoothly across the network.</p>
            </div>
          ) : (
            disputed.map(c => (
              <div className="card" key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between mb-24">
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>{c.title}</div>
                    <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{c.id}</div>
                  </div>
                  <span className="badge badge-disputed">DISPUTED</span>
                </div>

                <div className="card mb-24" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-strong)', padding: '16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8 }}>Case Reason</div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{c.disputeReason}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>At Stake</span>
                    <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{formatXLM(c.amount)}</span>
                  </div>
                  <div className="flex-between">
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Disputed On</span>
                    <span style={{ color: 'var(--text-heading)', fontWeight: '700' }}>{formatDate(c.disputedAt)}</span>
                  </div>
                </div>

                <button className="btn btn-primary btn-full" onClick={() => setSelected(c)} style={{ marginTop: 'auto' }}>
                  ⚖️ Open Case for Resolution
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'resolved' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 24 }}>
          {resolved.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 24px' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: 20 }}>📜</div>
              <h3>No History</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No disputes have been resolved yet.</p>
            </div>
          ) : (
            resolved.map(c => (
              <div className="card" key={c.id}>
                <div className="flex-between mb-24">
                  <div>
                    <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>{c.title}</div>
                    <div className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{c.id}</div>
                  </div>
                  <span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span>
                </div>
                
                <div className="card mb-24" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-strong)', padding: '16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Resolution</div>
                  <div style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '1rem' }}>
                    {c.resolution === 'freelancer' ? '✅ Released to Freelancer'
                      : c.resolution === 'client' ? '↩️ Refunded to Client'
                      : '⚡ Split 50/50'}
                  </div>
                </div>

                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Resolved On</span>
                  <span style={{ color: 'var(--text-heading)', fontWeight: '700' }}>{formatDate(c.resolvedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selected && <ResolutionModal contract={selected} />}
    </div>
  )
}
