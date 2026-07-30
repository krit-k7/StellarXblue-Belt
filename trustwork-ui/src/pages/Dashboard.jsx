import { useState } from 'react'
import ContractCard from '../components/ContractCard'
import { CONTRACT_STATES, formatXLM } from '../utils/contract'
import { PackageIcon } from '../components/icons'

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
      <div className="flex-between mb-48">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Manage your escrow contracts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setPage('create')}>
          + New Contract
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div className="stat-label">Total Contracts</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Active Escrows</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{stats.active}</div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Successfully Completed</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{stats.completed}</div>
        </div>
        <div className="card stat-card" style={{ background: 'var(--grad-primary)', color: 'var(--accent-ink)' }}>
          <div className="stat-label" style={{ color: 'rgba(0,0,0,0.6)' }}>Total Volume</div>
          <div className="stat-value" style={{ color: 'inherit' }}>{stats.volume.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: '700', opacity: 0.7, marginTop: 4 }}>XLM in Escrow</div>
        </div>
      </div>

      {/* ── Pending Review Banner ─────────────────────────────────────────── */}
      {pendingReview.length > 0 && (
        <div className="card" style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--yellow)',
          padding: '24px',
          marginBottom: 48,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ 
              width: 48, height: 48, borderRadius: '12px', background: 'var(--yellow-bg)', 
              display: 'flex', alignItems: 'center', justify_content: 'center', color: 'var(--yellow)' 
            }}>
              <PackageIcon width={24} height={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.1rem' }}>
                {pendingReview.length} Action Required
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Review and approve submissions to release funds.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {pendingReview.map(c => (
              <div
                key={c.id}
                className="card"
                style={{
                  background: 'var(--bg-sunken)',
                  border: '1px solid var(--border)',
                  padding: '16px',
                  cursor: 'pointer',
                }}
                onClick={() => onView(c)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{c.title}</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--accent)' }}>{formatXLM(c.amount)}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm btn-full"
                    onClick={(e) => { e.stopPropagation(); onView(c) }}
                  >
                    Review & Approve
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
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

      {/* Tabs */}
      <div className="flex-between mb-32" style={{ flexWrap: 'wrap' }}>
        <div className="tabs">
          {TABS.map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t !== 'All' && (
                <span style={{ marginLeft: 6, opacity: 0.6, fontSize: '0.75rem', fontWeight: '800' }}>
                  {contracts.filter(c => c.status === t.toUpperCase()).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contract Grid */}
      {filtered.length === 0 ? (
        <div className="card" style={{ padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 20 }}>📦</div>
          <h3 style={{ marginBottom: 12 }}>
            {!wallet ? 'Connect your wallet' : tab === 'All' ? 'No contracts yet' : `No ${tab.toLowerCase()} contracts`}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 24px' }}>
            {!wallet
              ? 'Connect your Stellar wallet to see your contracts.'
              : tab === 'All'
              ? 'Create your first escrow contract to get started.'
              : `No ${tab.toLowerCase()} contracts found.`}
          </p>
          {tab === 'All' && wallet && (
            <button className="btn btn-primary" onClick={() => setPage('create')}>
              Create Your First Contract
            </button>
          )}
        </div>
      ) : (
        <div className="contract-grid">
          {filtered.map(c => (
            <ContractCard 
              key={c.id} 
              contract={c} 
              onClick={() => onView(c)} 
              // ContractCard is not included in the bundle, but we expect it to inherit styles
            />
          ))}
        </div>
      )}
    </div>
  )
}
