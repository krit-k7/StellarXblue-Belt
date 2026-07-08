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
              <div className="wallet-dropdown">
                <div className="wallet-dropdown-addr">{wallet}</div>
                <button className="wallet-dropdown-item" onClick={() => { navigator.clipboard?.writeText(wallet); setDropdownOpen(false) }}>
                  Copy Address
                </button>
                <button className="wallet-dropdown-item danger" onClick={() => { onDisconnect(); setDropdownOpen(false) }}>
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
