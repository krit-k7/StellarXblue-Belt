import { useState } from 'react'
import ContractCard from '../components/ContractCard'
import { CONTRACT_STATES, formatXLM } from '../utils/contract'

const TABS = ['All', 'Active', 'Submitted', 'Completed', 'Disputed']

export default function Dashboard({ contracts, onView, setPage, wallet }) {
  const [tab, setTab] = useState('All')

  const filtered = tab === 'All'
    ? contracts
    : contracts.filter(c => c.status === tab.toUpperCase())

  // Contracts where the connected wallet is the client and work is submitted
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
    <div className="page">
      <div className="flex-between mb-32">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Manage your escrow contracts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPage('create')}>
          + New Contract
        </button>
      </div>

      {/* ── Pending Review Banner ─────────────────────────────────────────── */}
      {pendingReview.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(245,158,11,0.5)',
          borderRadius: 'var(--radius)',
          padding: '16px',
          marginBottom: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>📦</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                {pendingReview.length} contract{pendingReview.length > 1 ? 's' : ''} awaiting your review
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Approve to release payment to the freelancer
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingReview.map(c => (
              <div
                key={c.id}
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                }}
                onClick={() => onView(c)}
              >
                {/* Title + amount */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: 2 }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatXLM(c.amount)} in escrow
                  </div>
                </div>
                {/* Buttons — always stacked, full width */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-success btn-full"
                    onClick={(e) => { e.stopPropagation(); onView(c) }}
                  >
                    ✅ Review & Approve
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={(e) => handleDispute(e, c)}
                  >
                    ⚠️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Contracts</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.active}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.completed}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Volume</div>
          <div className="stat-value">{stats.volume.toLocaleString()}</div>
          <div className="stat-sub">XLM in escrow</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
            {t !== 'All' && (
              <span style={{ marginLeft: 6, opacity: 0.6, fontSize: '0.75rem' }}>
                {contracts.filter(c => c.status === t.toUpperCase()).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contract Grid */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">
            {!wallet ? 'Connect your wallet' : tab === 'All' ? 'No contracts yet' : `No ${tab.toLowerCase()} contracts`}
          </div>
          <div className="empty-desc">
            {!wallet
              ? 'Connect your Stellar wallet to see your contracts.'
              : tab === 'All'
              ? 'Create your first escrow contract to get started.'
              : `No ${tab.toLowerCase()} contracts found.`}
          </div>
          {tab === 'All' && wallet && (
            <button className="btn btn-primary" onClick={() => setPage('create')}>
              Create Contract
            </button>
          )}
        </div>
      ) : (
        <div className="contract-grid">
          {filtered.map(c => (
            <ContractCard key={c.id} contract={c} onClick={onView} />
          ))}
        </div>
      )}
    </div>
  )
}
