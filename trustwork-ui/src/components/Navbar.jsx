import { useState, useRef, useEffect } from 'react'
import { truncateAddr } from '../utils/contract'

export default function Navbar({ page, setPage, wallet, onOpenWallet, onDisconnect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const navItems = [
    { id: 'dashboard',   label: '📋 Dashboard' },
    { id: 'create',      label: '＋ New' },
    { id: 'arbitration', label: '⚖️ Arbitration' },
  ]

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <nav className="navbar">
      {/* Brand */}
      <div className="navbar-brand" onClick={() => setPage('home')}>
        <div className="navbar-logo">⚡</div>
        <span className="navbar-title">Trust<span>Work</span></span>
      </div>

      {/* Wallet — right side of top row */}
      <div className="navbar-right">
        {wallet ? (
          <div className="wallet-menu" ref={menuRef}>
            <div
              className="wallet-badge"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setDropdownOpen(o => !o)}
            >
              <span className="wallet-dot" />
              {truncateAddr(wallet)}
              <span style={{ marginLeft: 4, fontSize: '0.65rem', opacity: 0.6 }}>▾</span>
            </div>

            {dropdownOpen && (
              <div className="wallet-dropdown">
                <div className="wallet-dropdown-addr">{wallet}</div>
                <button className="wallet-dropdown-item" onClick={() => { navigator.clipboard?.writeText(wallet); setDropdownOpen(false) }}>
                  📋 Copy Address
                </button>
                <button className="wallet-dropdown-item" onClick={() => { window.open(`https://stellar.expert/explorer/testnet/account/${wallet}`, '_blank'); setDropdownOpen(false) }}>
                  🔍 Explorer
                </button>
                <button className="wallet-dropdown-item" onClick={() => { onOpenWallet(); setDropdownOpen(false) }}>
                  ⚙️ Wallet Details
                </button>
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                <button className="wallet-dropdown-item danger" onClick={() => { onDisconnect(); setDropdownOpen(false) }}>
                  🔌 Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={onOpenWallet}>
            Connect
          </button>
        )}
      </div>

      {/* Nav links — wraps to second row on mobile via CSS */}
      <div className="navbar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-btn ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
