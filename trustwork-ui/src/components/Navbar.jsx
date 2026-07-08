import { useState, useRef, useEffect } from 'react'
import { truncateAddr } from '../utils/contract'

export default function Navbar({ page, setPage, wallet, onOpenWallet, onDisconnect }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'analytics',   label: 'Analytics' },
    { id: 'faucet',      label: 'Faucet' },
    { id: 'history',     label: 'History' },
    { id: 'settings',    label: 'Settings' },
    { id: 'transfer',    label: 'XLM Direct Transfer' },
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
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="white" fillOpacity="0.9"/>
            <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="white" fillOpacity="0.5"/>
            <path d="M16 16V30" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="navbar-title">StellarX</span>
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
        <button className="theme-toggle" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="4.22" x2="19.78" y2="5.64"/>
          </svg>
        </button>

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}>
              <rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M16 10v8"/>
            </svg>
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  )
}
