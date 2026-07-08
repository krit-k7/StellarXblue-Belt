import { useState, useRef, useEffect } from 'react'
import { truncateAddr } from '../utils/contract'

export default function Navbar({ page, setPage, wallet, onOpenWallet, onDisconnect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'create',      label: 'New' },
    { id: 'arbitration', label: 'Arbitration' },
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
      <div className="navbar-brand" onClick={() => setPage('home')}>
        <div className="navbar-logo">
          <div style={{ 
            width: '32px', 
            height: '32px', 
            background: 'var(--accent)', 
            borderRadius: '8px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontSize: '16px',
            color: 'var(--accent-ink)'
          }}>⚡</div>
        </div>
        <span className="navbar-title">Trust<span>Work</span></span>
      </div>

      <div className="navbar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-link ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </div>
        ))}
      </div>

      <div className="navbar-right">
        {wallet ? (
          <div className="wallet-menu" ref={menuRef}>
            <div
              className="wallet-badge"
              style={{ cursor: 'pointer' }}
              onClick={() => setDropdownOpen(o => !o)}
            >
              <span className="wallet-dot" />
              {truncateAddr(wallet)}
            </div>

            {dropdownOpen && (
              <div className="wallet-dropdown" style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px',
                minWidth: '200px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                zIndex: 100
              }}>
                <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: '8px', wordBreak: 'break-all' }}>{wallet}</div>
                <button className="wallet-dropdown-item" onClick={() => { navigator.clipboard?.writeText(wallet); setDropdownOpen(false) }} style={{
                  width: '100%', background: 'none', border: 'none', color: 'var(--text)', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem'
                }}>
                  Copy Address
                </button>
                <button className="wallet-dropdown-item danger" onClick={() => { onDisconnect(); setDropdownOpen(false) }} style={{
                  width: '100%', background: 'none', border: 'none', color: 'var(--red)', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem'
                }}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onOpenWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  )
}
