// =============================================================================
// TxModal.jsx — Transaction signing popup
//
// Shown before every on-chain action. Displays:
//   - What the transaction does
//   - Estimated fee
//   - Network
//   - Freighter signing prompt
//   - Success (with tx hash + explorer link) or error state
// =============================================================================

import { EXPLORER_BASE, NETWORK } from '../utils/stellar'

export default function TxModal({ tx, onClose }) {
  if (!tx) return null

  const { status, title, description, fee, txHash, error, network } = tx

  // ── During signing: show a small non-blocking toast so Freighter popup
  // can receive focus. The overlay would block the extension popup.
  if (status === 'signing') {
    return (
      <div className="tx-toast" style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '16px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 300, minWidth: 0, maxWidth: 'min(480px, calc(100vw - 24px))', width: 'calc(100vw - 24px)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: 3 }}>
            {title}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Freighter popup opening — check your browser toolbar if it doesn't appear automatically.
          </div>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--accent)', background: 'var(--accent-glow)', padding: '3px 8px', borderRadius: 8, flexShrink: 0, textTransform: 'uppercase', fontWeight: 700 }}>
          {(network || NETWORK).toUpperCase()}
        </span>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={status === 'success' || status === 'error' ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>

        {/* ── Submitting ── */}
        {status === 'submitting' && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
            <h3 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>Submitting to Stellar...</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Transaction signed. Broadcasting to the network and waiting for confirmation.
            </p>
          </div>
        )}

        {/* ── Success ── */}
        {status === 'success' && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
            <h3 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>{title} — Confirmed</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
              Transaction confirmed on Stellar {NETWORK}.
            </p>
            {txHash && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>TRANSACTION HASH</div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-heading)', wordBreak: 'break-all' }}>
                  {txHash}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <a
                    href={`${EXPLORER_BASE}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, fontSize: '0.78rem' }}
                  >
                    🔍 View on Stellar Expert
                  </a>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => navigator.clipboard?.writeText(txHash)}
                  >
                    📋
                  </button>
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={onClose}>Done</button>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>❌</div>
            <h3 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>Transaction Failed</h3>
            <div className="alert alert-danger" style={{ textAlign: 'left', marginBottom: 20 }}>
              {error || 'An unknown error occurred.'}
            </div>
            <button className="btn btn-secondary btn-full" onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}

function TxDetails({ title, description, fee, network }) {
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Action</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-heading)' }}>{title}</span>
      </div>
      {description && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Details</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text)', maxWidth: '60%', textAlign: 'right' }}>{description}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Network</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase' }}>{network}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Est. Fee</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-heading)' }}>{fee || '~0.00001 XLM'}</span>
      </div>
    </div>
  )
}
