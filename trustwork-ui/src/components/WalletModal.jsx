
// =============================================================================
// WalletModal.jsx — Wallet connection popup
// States: choose wallet → connecting → connected / error / not-installed
// =============================================================================

import { truncateAddr } from '../utils/contract'

const FREIGHTER_URL = 'https://www.freighter.app'

const WALLETS = [
  {
    id: 'freighter',
    name: 'Freighter',
    icon: '🚀',
    desc: 'Official Stellar browser extension wallet',
    badge: 'Recommended',
    badgeColor: 'var(--accent)',
  },
  {
    id: 'demo',
    name: 'Demo Wallet',
    icon: '🧪',
    desc: 'Simulated wallet for testing — no extension needed',
    badge: 'Dev Mode',
    badgeColor: 'var(--yellow)',
  },
]

export default function WalletModal({ walletState, onClose }) {
  const { installed, connecting, connect, disconnect, address, network, networkOk, error } = walletState

  // ── Still detecting extension ──────────────────────────────────────────────
  if (installed === null) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spinner />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 20 }}>
            Detecting Freighter...
          </p>
        </div>
      </Overlay>
    )
  }

  // ── Connected state ────────────────────────────────────────────────────────
  if (address) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
          <h3 style={{ color: 'var(--text-heading)', marginBottom: 6 }}>Wallet Connected</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            You're connected to Stellar {network || 'Testnet'}
          </p>
        </div>

        {!networkOk && (
          <div className="alert alert-warning" style={{ marginBottom: 16 }}>
            ⚠️ Switch to Stellar Testnet or Mainnet in Freighter settings.
          </div>
        )}

        {/* Address card */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: 20,
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Your Address
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--purple))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', flexShrink: 0,
            }}>
              {address.slice(1, 2)}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-heading)', wordBreak: 'break-all' }}>
                {address}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <NetworkPill network={network} ok={networkOk} />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigator.clipboard?.writeText(address)}
              style={{ fontSize: '0.75rem' }}
            >
              📋 Copy
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary btn-full" onClick={() => { disconnect(); onClose() }}>
            Disconnect
          </button>
          <button className="btn btn-primary btn-full" onClick={onClose}>
            Done
          </button>
        </div>
      </Overlay>
    )
  }

  // ── Connecting spinner ─────────────────────────────────────────────────────
  if (connecting) {
    return (
      <Overlay onClose={null}>
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <Spinner />
          <h3 style={{ color: 'var(--text-heading)', marginTop: 20, marginBottom: 8 }}>Connecting...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Check your Freighter extension to approve the connection.
          </p>
        </div>
      </Overlay>
    )
  }

  // ── Not installed ──────────────────────────────────────────────────────────
  if (!installed) {
    return (
      <Overlay onClose={onClose}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🚀</div>
          <h3 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>Freighter Not Detected</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Install the Freighter browser extension to connect your Stellar wallet, or use Demo Mode to explore the app.
          </p>
        </div>

        <a
          href={FREIGHTER_URL}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-full btn-lg"
          style={{ display: 'flex', marginBottom: 12, textDecoration: 'none' }}
        >
          Install Freighter →
        </a>

        <button
          className="btn btn-secondary btn-full"
          style={{ marginBottom: 12 }}
          onClick={() => connect('freighter')}
        >
          🔄 I already have it — Try Again
        </button>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 12 }}>
          or
        </div>

        <button
          className="btn btn-secondary btn-full"
          onClick={() => connect('demo')}
        >
          🧪 Continue with Demo Wallet
        </button>

        {error && <ErrorBox message={error} />}
      </Overlay>
    )
  }

  // ── Default: wallet picker ─────────────────────────────────────────────────
  return (
    <Overlay onClose={onClose}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: 'var(--text-heading)', marginBottom: 6 }}>Connect Wallet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Choose how you want to connect to TrustWork on Stellar.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {WALLETS.map(w => (
          <button
            key={w.id}
            onClick={() => connect(w.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              width: '100%',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem',
            }}>
              {w.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{w.name}</span>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px',
                  borderRadius: 10, background: w.badgeColor + '22',
                  color: w.badgeColor, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {w.badge}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{w.desc}</div>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>›</div>
          </button>
        ))}
      </div>

      {error && <ErrorBox message={error} />}

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        By connecting, you agree to interact with Soroban smart contracts on Stellar.
        TrustWork never stores your private keys.
      </p>
    </Overlay>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Overlay({ children, onClose }) {
  return (
    <div
      className="modal-overlay"
      onClick={onClose ? (e => { if (e.target === e.currentTarget) onClose() }) : undefined}
    >
      <div className="modal" style={{ maxWidth: 440, width: '100%' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

function NetworkPill({ network, ok }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600,
      background: ok ? 'var(--green-bg)' : 'var(--red-bg)',
      color: ok ? 'var(--green)' : 'var(--red)',
      border: `1px solid ${ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      {network || 'Unknown'}
    </span>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="alert alert-danger" style={{ marginTop: 12 }}>
      ⚠️ {message}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', margin: '0 auto',
      border: '3px solid var(--border)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}
