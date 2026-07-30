import { useState, useRef, useEffect } from 'react'
import { truncateAddr } from '../utils/contract'
import { LogoMark, SunIcon, MoonIcon } from './icons'

export default function Navbar({ page, setPage, wallet, onOpenWallet, onDisconnect, theme, toggleTheme }) {
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
    <div className="navbar-wrapper">
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => setPage('home')}>
          <div className="navbar-logo">
            <LogoMark size={32} />
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
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              width: 40, height: 40, borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-strong)', background: 'var(--overlay-1)',
              color: 'var(--text-heading)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {theme === 'dark' ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
          </button>

          {wallet ? (
            <div className="wallet-menu" ref={menuRef} style={{ position: 'relative' }}>
              <div
                className="wallet-badge"
                style={{ 
                  cursor: 'pointer', 
                  background: 'var(--grad-primary)', 
                  color: 'var(--accent-ink)',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}
                onClick={() => setDropdownOpen(o => !o)}
              >
                {truncateAddr(wallet)}
              </div>

              {dropdownOpen && (
                <div className="wallet-dropdown" style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius)',
                  padding: '12px',
                  minWidth: '220px',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                  zIndex: 100
                }}>
                  <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: '8px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{wallet}</div>
                  <button className="wallet-dropdown-item" onClick={() => { navigator.clipboard?.writeText(wallet); setDropdownOpen(false) }} style={{
                    width: '100%', background: 'none', border: 'none', color: 'var(--text)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600'
                  }}>
                    Copy Address
                  </button>
                  <button className="wallet-dropdown-item danger" onClick={() => { onDisconnect(); setDropdownOpen(false) }} style={{
                    width: '100%', background: 'none', border: 'none', color: 'var(--red)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem', fontWeight: '600'
                  }}>
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onOpenWallet} style={{ padding: '10px 24px' }}>
              Connect Wallet
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
