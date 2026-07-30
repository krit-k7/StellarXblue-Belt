import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { truncateAddr } from '../utils/contract'
import { LogoMark, SunIcon, MoonIcon } from './icons'

export default function Navbar({ page, setPage, wallet, onOpenWallet, onDisconnect, theme, toggleTheme }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  const navItems = [
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'create',      label: 'New Contract' },
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
      <motion.div 
        className="navbar-brand" 
        onClick={() => setPage('home')}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="navbar-logo" style={{ 
          background: 'var(--grad-primary)',
          padding: '4px',
          borderRadius: '10px',
          boxShadow: '0 0 15px var(--accent-glow)'
        }}>
          <LogoMark size={28} color="#fff" />
        </div>
        <span className="navbar-title" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          TRUST<span style={{ color: 'var(--accent)' }}>WORK</span>
        </span>
      </motion.div>

      <div className="navbar-nav">
        {navItems.map(item => (
          <motion.div
            key={item.id}
            className={`nav-link ${page === item.id ? 'active' : ''}`}
            onClick={() => setPage(item.id)}
            whileHover={{ y: -1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            style={{ position: 'relative' }}
          >
            {item.label}
            {page === item.id && (
              <motion.div 
                layoutId="nav-active"
                style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: '20%', 
                  right: '20%', 
                  height: '2px', 
                  background: 'var(--accent)',
                  borderRadius: '2px'
                }} 
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="navbar-right">
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle theme"
          style={{
            width: 40, height: 40, borderRadius: '12px',
            border: '1px solid var(--border-strong)', background: 'var(--overlay-1)',
            color: 'var(--text-heading)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {theme === 'dark' ? <SunIcon width={20} height={20} /> : <MoonIcon width={20} height={20} />}
        </motion.button>

        {wallet ? (
          <div className="wallet-menu" ref={menuRef} style={{ position: 'relative' }}>
            <motion.div
              className="wallet-badge"
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--overlay-1)', border: '1px solid var(--border-strong)', borderRadius: '12px' }}
              onClick={() => setDropdownOpen(o => !o)}
              whileHover={{ borderColor: 'var(--accent)' }}
            >
              <span className="wallet-dot" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{truncateAddr(wallet)}</span>
            </motion.div>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: '16px',
                    padding: '12px',
                    minWidth: '220px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                    zIndex: 100,
                    backdropFilter: 'blur(20px)'
                  }}
                >
                  <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', marginBottom: '8px', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>{wallet}</div>
                  <button 
                    className="wallet-dropdown-item" 
                    onClick={() => { navigator.clipboard?.writeText(wallet); setDropdownOpen(false) }} 
                    style={{
                      width: '100%', background: 'none', border: 'none', color: 'var(--text)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--overlay-2)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Copy Address
                  </button>
                  <button 
                    className="wallet-dropdown-item danger" 
                    onClick={() => { onDisconnect(); setDropdownOpen(false) }} 
                    style={{
                      width: '100%', background: 'none', border: 'none', color: 'var(--red)', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '0.875rem', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--red-bg)'}
                    onMouseLeave={(e) => e.target.style.background = 'none'}
                  >
                    Disconnect
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.button 
            className="btn btn-primary" 
            onClick={onOpenWallet}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ borderRadius: '12px', padding: '10px 20px' }}
          >
            Connect Wallet
          </motion.button>
        )}
      </div>
    </nav>
  )
}
