// =============================================================================
// MetricsDashboard.jsx — Live platform analytics and monitoring dashboard
// Shows: user stats, contract metrics, health checks, security status, errors
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import { fetchPlatformMetrics, getLocalMetrics } from '../utils/analytics'
import { runSecurityChecklist, getSecurityScore } from '../utils/security'
import { generateMonitoringReport, getPerformanceStats, getUptime } from '../utils/monitoring'
import { RPC_URL, CONTRACT_ID } from '../utils/stellar'
import { formatXLM } from '../utils/contract'

const REFRESH_INTERVAL = 30000 // 30 seconds

export default function MetricsDashboard({ contracts, wallet }) {
  const [platformMetrics, setPlatformMetrics] = useState(null)
  const [localMetrics, setLocalMetrics]       = useState(null)
  const [healthReport, setHealthReport]       = useState(null)
  const [securityResults, setSecurityResults] = useState([])
  const [securityScore, setSecurityScore]     = useState(0)
  const [perfStats, setPerfStats]             = useState(null)
  const [uptime, setUptime]                   = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [lastRefresh, setLastRefresh]         = useState(null)
  const [activeTab, setActiveTab]             = useState('overview')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [platform, health] = await Promise.all([
        fetchPlatformMetrics(),
        generateMonitoringReport(RPC_URL),
      ])
      setPlatformMetrics(platform)
      setHealthReport(health)
      setLocalMetrics(getLocalMetrics(contracts, wallet))
      setSecurityResults(runSecurityChecklist())
      setSecurityScore(getSecurityScore())
      setPerfStats(getPerformanceStats())
      setUptime(getUptime())
      setLastRefresh(new Date())
    } catch (err) {
      console.error('MetricsDashboard refresh error:', err)
    } finally {
      setLoading(false)
    }
  }, [contracts, wallet])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [refresh])

  // Update uptime every second
  useEffect(() => {
    const t = setInterval(() => setUptime(getUptime()), 1000)
    return () => clearInterval(t)
  }, [])

  const local = localMetrics || {}
  const health = healthReport?.checks || {}
  const overall = healthReport?.overall || 'unknown'

  const statusColor = {
    healthy: 'var(--green)',
    degraded: 'var(--yellow)',
    down: 'var(--red)',
    unknown: 'var(--text-muted)',
  }

  const statusIcon = {
    healthy: '✅',
    degraded: '⚠️',
    down: '❌',
    unknown: '❓',
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between mb-32">
        <div>
          <h2 className="page-title">📊 Metrics Dashboard</h2>
          <p className="page-subtitle">
            Live platform analytics, health monitoring &amp; security status
            {lastRefresh && (
              <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {/* System Status Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid ${statusColor[overall]}44`,
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.5rem' }}>{statusIcon[overall]}</span>
          <div>
            <div style={{ fontWeight: 700, color: statusColor[overall], fontSize: '1rem' }}>
              System {overall.charAt(0).toUpperCase() + overall.slice(1)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Health Score: {healthReport?.score ?? '—'}% · Uptime: {uptime?.formatted || '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <ServiceBadge label="Stellar RPC" status={health.rpc?.healthy} latency={health.rpc?.latency} />
          <ServiceBadge label="Database" status={health.supabase?.healthy !== false} />
          <ServiceBadge label="Freighter" status={health.freighter?.installed} />
          <ServiceBadge label="Contract" status={!!CONTRACT_ID} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {['overview', 'users', 'contracts', 'security', 'monitoring'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          {/* Key Metrics */}
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 24 }}>
            <MetricCard
              label="Total Users"
              value={platformMetrics?.totalUsers ?? '—'}
              sub="verified wallets"
              color="var(--accent)"
              icon="👥"
            />
            <MetricCard
              label="Active (7d)"
              value={platformMetrics?.activeUsers ?? '—'}
              sub="unique wallets"
              color="var(--green)"
              icon="🟢"
            />
            <MetricCard
              label="Contracts Created"
              value={platformMetrics?.contractsCreated ?? local.totalContracts ?? '—'}
              sub="all time"
              color="var(--purple)"
              icon="📋"
            />
            <MetricCard
              label="Completed"
              value={platformMetrics?.contractsCompleted ?? local.completedContracts ?? '—'}
              sub={`${local.successRate ?? 0}% success rate`}
              color="var(--green)"
              icon="✅"
            />
            <MetricCard
              label="Total Volume"
              value={platformMetrics?.totalVolume
                ? `${Number(platformMetrics.totalVolume).toLocaleString()}`
                : local.totalVolume?.toLocaleString() ?? '—'}
              sub="XLM in escrow"
              color="var(--yellow)"
              icon="💰"
            />
            <MetricCard
              label="Disputes"
              value={platformMetrics?.disputesRaised ?? local.disputedContracts ?? '—'}
              sub={`${local.disputeRate ?? 0}% dispute rate`}
              color="var(--red)"
              icon="⚠️"
            />
          </div>

          {/* Activity Chart */}
          {platformMetrics?.dailyData && (
            <div className="card" style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
                📈 7-Day Activity
              </div>
              <MiniBarChart data={platformMetrics.dailyData} />
            </div>
          )}

          {/* Your Stats */}
          <div className="card">
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              👤 Your Activity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <MiniStat label="As Client" value={local.asClient ?? 0} />
              <MiniStat label="As Freelancer" value={local.asFreelancer ?? 0} />
              <MiniStat label="Active" value={local.activeContracts ?? 0} />
              <MiniStat label="Completed" value={local.completedContracts ?? 0} />
              <MiniStat label="Avg Completion" value={local.avgCompletionDays ? `${local.avgCompletionDays}d` : '—'} />
              <MiniStat label="Volume" value={local.totalVolume ? `${local.totalVolume.toLocaleString()} XLM` : '0 XLM'} />
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <MetricCard label="Total Registered" value={platformMetrics?.totalUsers ?? '—'} icon="👥" color="var(--accent)" />
            <MetricCard label="Active (7d)" value={platformMetrics?.activeUsers ?? '—'} icon="🟢" color="var(--green)" />
            <MetricCard label="Verified" value={platformMetrics?.totalUsers ?? '—'} sub="wallet-verified" icon="✅" color="var(--green)" />
          </div>

          {platformMetrics?.recentUsers?.length > 0 ? (
            <div className="card">
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
                🕐 Recent Users
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {platformMetrics.recentUsers.map((u, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  }}>
                    <div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-heading)' }}>
                        {u.wallet_address?.slice(0, 8)}...{u.wallet_address?.slice(-6)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {u.network} · {u.visit_count} visits
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      <div>First: {new Date(u.first_seen).toLocaleDateString()}</div>
                      <div>Last: {new Date(u.last_seen).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <NoDataCard message="Connect Supabase to see user analytics across all devices." />
          )}
        </div>
      )}

      {/* ── CONTRACTS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'contracts' && (
        <div>
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <MetricCard label="Total" value={local.totalContracts ?? 0} icon="📋" color="var(--accent)" />
            <MetricCard label="Active" value={local.activeContracts ?? 0} icon="🔵" color="var(--accent)" />
            <MetricCard label="Completed" value={local.completedContracts ?? 0} icon="✅" color="var(--green)" />
            <MetricCard label="Disputed" value={local.disputedContracts ?? 0} icon="⚠️" color="var(--red)" />
            <MetricCard label="Success Rate" value={`${local.successRate ?? 0}%`} icon="📈" color="var(--green)" />
            <MetricCard label="Dispute Rate" value={`${local.disputeRate ?? 0}%`} icon="📉" color="var(--red)" />
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              📋 Contract Breakdown
            </div>
            <StatusBreakdown contracts={contracts} />
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div>
          {/* Security Score */}
          <div className="card" style={{ marginBottom: 24, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: securityScore >= 80 ? 'var(--green)' : securityScore >= 60 ? 'var(--yellow)' : 'var(--red)' }}>
              {securityScore}%
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
              Security Score — {securityScore >= 80 ? '✅ Excellent' : securityScore >= 60 ? '⚠️ Good' : '❌ Needs Attention'}
            </div>
          </div>

          {/* Checklist */}
          <div className="card">
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              🔒 Security Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {securityResults.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1rem' }}>{item.passed ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-heading)', fontWeight: 500 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {item.severity}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px',
                    borderRadius: 12,
                    background: item.passed ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: item.passed ? 'var(--green)' : 'var(--red)',
                  }}>
                    {item.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MONITORING TAB ───────────────────────────────────────────────── */}
      {activeTab === 'monitoring' && (
        <div>
          {/* Service Health */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              🏥 Service Health
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <HealthRow
                label="Stellar RPC"
                healthy={health.rpc?.healthy}
                detail={health.rpc?.latency ? `${health.rpc.latency}ms` : health.rpc?.error}
                url={RPC_URL}
              />
              <HealthRow
                label="Supabase Database"
                healthy={health.supabase?.healthy !== false}
                detail={health.supabase?.reason === 'not_configured' ? 'Not configured' : health.supabase?.latency ? `${health.supabase.latency}ms` : health.supabase?.error}
              />
              <HealthRow
                label="Freighter Wallet"
                healthy={health.freighter?.installed}
                detail={health.freighter?.installed ? 'Extension detected' : 'Not installed'}
              />
              <HealthRow
                label="Smart Contract"
                healthy={!!CONTRACT_ID}
                detail={CONTRACT_ID ? `${CONTRACT_ID.slice(0, 8)}...${CONTRACT_ID.slice(-6)}` : 'Not configured'}
              />
            </div>
          </div>

          {/* Performance */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
              ⚡ Performance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              <MiniStat label="RPC Avg Latency" value={perfStats?.rpc?.avg ? `${perfStats.rpc.avg}ms` : '—'} />
              <MiniStat label="RPC Max Latency" value={perfStats?.rpc?.max ? `${perfStats.rpc.max}ms` : '—'} />
              <MiniStat label="Tx Confirm Avg" value={perfStats?.tx?.avg ? `${(perfStats.tx.avg / 1000).toFixed(1)}s` : '—'} />
              <MiniStat label="Page Load" value={perfStats?.pageLoad ? `${perfStats.pageLoad}ms` : '—'} />
              <MiniStat label="RPC Samples" value={perfStats?.rpc?.samples ?? 0} />
              <MiniStat label="Tx Samples" value={perfStats?.tx?.samples ?? 0} />
            </div>
          </div>

          {/* Error Breakdown */}
          {platformMetrics?.errorBreakdown?.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 16 }}>
                🐛 Error Breakdown (Last 24h)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {platformMetrics.errorBreakdown.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-heading)' }}>{e.type}</span>
                    <span style={{
                      background: 'var(--red-bg)', color: 'var(--red)',
                      padding: '2px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600,
                    }}>{e.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!platformMetrics && (
            <NoDataCard message="Connect Supabase to enable full monitoring. Local performance data is shown above." />
          )}
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div className="stat-label">{label}</div>
        <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      </div>
      <div className="stat-value" style={{ color: color || 'var(--text-heading)' }}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '12px 14px',
    }}>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-heading)' }}>{value}</div>
    </div>
  )
}

function ServiceBadge({ label, status, latency }) {
  const color = status ? 'var(--green)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', boxShadow: `0 0 6px ${color}` }} />
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      {latency && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>({latency}ms)</span>}
    </div>
  )
}

function HealthRow({ label, healthy, detail, url }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1rem' }}>{healthy ? '✅' : '❌'}</span>
        <div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-heading)', fontWeight: 500 }}>{label}</div>
          {url && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{url.slice(0, 40)}</div>}
        </div>
      </div>
      <div style={{ fontSize: '0.78rem', color: healthy ? 'var(--green)' : 'var(--red)', textAlign: 'right' }}>
        {detail || (healthy ? 'Online' : 'Offline')}
      </div>
    </div>
  )
}

function StatusBreakdown({ contracts }) {
  const statuses = ['ACTIVE', 'SUBMITTED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'AWAITING_DEPOSIT']
  const colors = {
    ACTIVE: 'var(--accent)', SUBMITTED: 'var(--yellow)', COMPLETED: 'var(--green)',
    DISPUTED: 'var(--red)', REFUNDED: 'var(--purple)', AWAITING_DEPOSIT: 'var(--text-muted)',
  }
  const total = contracts.length || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {statuses.map(status => {
        const count = contracts.filter(c => c.status === status).length
        const pct = Math.round((count / total) * 100)
        return (
          <div key={status}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{status}</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-heading)', fontWeight: 600 }}>{count}</span>
            </div>
            <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: colors[status], borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MiniBarChart({ data }) {
  const maxContracts = Math.max(...data.map(d => d.contracts), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', background: 'var(--accent)',
            height: `${Math.max(4, (d.contracts / maxContracts) * 60)}px`,
            borderRadius: '3px 3px 0 0', opacity: 0.8,
            transition: 'height 0.3s ease',
          }} />
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            {new Date(d.date).toLocaleDateString('en', { weekday: 'short' })}
          </div>
        </div>
      ))}
    </div>
  )
}

function NoDataCard({ message }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>📡</div>
      <div style={{ color: 'var(--text-heading)', fontWeight: 600, marginBottom: 8 }}>Supabase Not Connected</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: 400, margin: '0 auto' }}>
        {message}
      </div>
      <div style={{ marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Add <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_URL</code> and{' '}
        <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>VITE_SUPABASE_ANON_KEY</code> to your .env file.
      </div>
    </div>
  )
}
