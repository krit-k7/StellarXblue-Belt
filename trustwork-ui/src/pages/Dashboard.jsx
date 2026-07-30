import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContractCard from '../components/ContractCard'
import { CONTRACT_STATES, formatXLM } from '../utils/contract'
import { PackageIcon, BoltIcon, ShieldCheckIcon, HistoryIcon } from '../components/icons'

const TABS = ['All', 'Active', 'Submitted', 'Completed', 'Disputed']

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

export default function Dashboard({ contracts, onView, setPage, wallet }) {
  const [tab, setTab] = useState('All')

  const filtered = tab === 'All'
    ? contracts
    : contracts.filter(c => c.status === tab.toUpperCase())

  const pendingReview = contracts.filter(
    c => c.status === CONTRACT_STATES.SUBMITTED && c.client === wallet
  )

  const stats = {
    total: contracts.length,
    active: contracts.filter(c => c.status === CONTRACT_STATES.ACTIVE).length,
    completed: contracts.filter(c => c.status === CONTRACT_STATES.COMPLETED).length,
    volume: contracts.reduce((sum, c) => sum + Number(c.amount || 0), 0),
  }

  function handleDispute(e, contract) {
    e.stopPropagation()
    onView(contract)
  }

  return (
    <motion.div 
      className="page"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.div className="flex-between mb-32" variants={item}>
        <div>
          <h2 className="page-title" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Dashboard</h2>
          <p className="page-subtitle">Manage and track your active escrow contracts</p>
        </div>
        <motion.button 
          className="btn btn-primary" 
          onClick={() => setPage('create')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ borderRadius: '12px' }}
        >
          + New Contract
        </motion.button>
      </motion.div>

      {/* ── Pending Review Banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {pendingReview.length > 0 && (
          <motion.div 
            variants={item}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 'var(--radius)',
              padding: '20px',
              marginBottom: 32,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PackageIcon width={18} height={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem' }}>
                  Action Required: {pendingReview.length} Pending Review{pendingReview.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Work has been submitted. Review and release payment.
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {pendingReview.map(c => (
                <motion.div
                  key={c.id}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '16px',
                    cursor: 'pointer',
                  }}
                  onClick={() => onView(c)}
                >
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.95rem', marginBottom: 4 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                      {formatXLM(c.amount)} XLM
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm btn-full"
                      style={{ background: 'var(--accent)', color: '#fff', borderRadius: '8px' }}
                      onClick={(e) => { e.stopPropagation(); onView(c) }}
                    >
                      Review Work
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div className="stats-grid" variants={item}>
        <div className="card stat-card" style={{ background: 'var(--overlay-1)' }}>
          <div className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HistoryIcon width={14} height={14} /> Total Contracts
          </div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="card stat-card" style={{ background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <div className="stat-label" style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BoltIcon width={14} height={14} /> Active
          </div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.active}</div>
        </div>
        <div className="card stat-card" style={{ background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.2)' }}>
          <div className="stat-label" style={{ color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheckIcon width={14} height={14} /> Completed
          </div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.completed}</div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--overlay-1)' }}>
          <div className="stat-label">Total Volume</div>
          <div className="stat-value">{stats.volume.toLocaleString()} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>XLM</span></div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div className="tabs" variants={item} style={{ marginBottom: 32, padding: '6px', borderRadius: '14px' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            style={{ borderRadius: '10px', padding: '10px 20px' }}
          >
            {t}
            {t !== 'All' && (
              <span style={{ marginLeft: 8, opacity: 0.5, fontSize: '0.7rem', background: tab === t ? 'rgba(255,255,255,0.2)' : 'var(--overlay-2)', padding: '2px 6px', borderRadius: '4px' }}>
                {contracts.filter(c => c.status === t.toUpperCase()).length}
              </span>
            )}
          </button>
        ))}
      </motion.div>

      {/* Contract Grid */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div 
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="empty-state"
          >
            <div className="empty-icon" style={{ background: 'var(--overlay-1)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}>
              <PackageIcon width={32} height={32} />
            </div>
            <div className="empty-title" style={{ fontSize: '1.25rem' }}>
              {!wallet ? 'Connect Wallet' : tab === 'All' ? 'No Contracts Found' : `No ${tab} Contracts`}
            </div>
            <p className="empty-desc">
              {!wallet
                ? 'Connect your Stellar wallet to manage your escrow contracts.'
                : tab === 'All'
                ? 'You haven\'t created any contracts yet. Start by creating a new one.'
                : `There are currently no contracts in the ${tab.toLowerCase()} state.`}
            </p>
            {tab === 'All' && wallet && (
              <button className="btn btn-primary" onClick={() => setPage('create')} style={{ borderRadius: '12px' }}>
                Create First Contract
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            className="contract-grid"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filtered.map(c => (
              <motion.div key={c.id} variants={item}>
                <ContractCard contract={c} onClick={onView} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
