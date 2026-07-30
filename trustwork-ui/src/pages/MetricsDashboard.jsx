import { useState, useEffect, useCallback } from 'react'
import { fetchPlatformMetrics, getLocalMetrics } from '../utils/analytics'
import { runSecurityChecklist, getSecurityScore } from '../utils/security'
import { generateMonitoringReport, getPerformanceStats, getUptime } from '../utils/monitoring'
import { RPC_URL, CONTRACT_ID } from '../utils/stellar'
import { formatXLM } from '../utils/contract'

const REFRESH_INTERVAL = 30000

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
      console.error('Metrics refresh error:', err)
    } finally {
      setLoading(false)
    }
  }, [contracts, wallet])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, REFRESH_INTERVAL)
    return () => clearInterval(interval)
  }, [refresh])

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

  return (
    <div className="page">
      <div className="flex-between mb-48">
        <div>
          <h2 className="page-title italic-serif">Network Metrics</h2>
          <p className="page-subtitle">Real-time Soroban platform analytics.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {lastRefresh && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing...' : '🔄 Sync'}
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="card" style={{
        background: 'var(--bg-sunken)',
        border: `1px solid ${statusColor[overall]}44`,
        padding: '24px 32px',
        marginBottom: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: 'var(--radius)', 
            background: `${statusColor[overall]}11`, border: `1px solid ${statusColor[overall]}44`,
            display: 'flex', alignItems: 'center', justify_content: 'center',
            fontSize: '2rem'
          }}>
            {overall === 'healthy' ? '✅' : overall === 'degraded' ? '⚠️' : '❌'}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: statusColor[overall], fontSize: '1.25rem', textTransform: 'capitalize' }}>
              System {overall}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Score: {healthReport?.score ?? '—'}% · Uptime: {uptime?.formatted || '—'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ServiceBadge label="Stellar RPC" status={health.rpc?.healthy} />
          <ServiceBadge label="Database" status={health.supabase?.healthy !== false} />
          <ServiceBadge label="Contract" status={!!CONTRACT_ID} />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-32">
        {['overview', 'users', 'contracts', 'security'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <div className="stats-grid">
            <MetricCard label="Total Wallets" value={platformMetrics?.totalUsers ?? '—'} sub="Unique users" color="var(--accent)" icon="👥" />
            <MetricCard label="Active (7d)" value={platformMetrics?.activeUsers ?? '—'} sub="Last 7 days" color="var(--green)" icon="🟢" />
            <MetricCard label="Contracts" value={platformMetrics?.contractsCreated ?? local.totalContracts ?? '—'} sub="Total deployed" color="var(--purple)" icon="📋" />
            <MetricCard label="Volume" value={platformMetrics?.totalVolume ? `${Number(platformMetrics.totalVolume).toLocaleString()}` : '—'} sub="XLM Locked" color="var(--yellow)" icon="💰" />
          </div>

          <div className="card">
            <h3 className="mb-24">Network Performance</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
              <MiniStat label="RPC Latency" value={health.rpc?.latency ? `${health.rpc.latency}ms` : '—'} />
              <MiniStat label="DB Latency" value={health.supabase?.latency ? `${health.supabase.latency}ms` : '—'} />
              <MiniStat label="Uptime" value={uptime?.formatted || '—'} />
              <MiniStat label="Health Score" value={`${healthReport?.score ?? 0}%`} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
          <div className="card" style={{ textAlign: 'center', padding: '60px 24px' }}>
            <div style={{ 
              fontSize: '4rem', fontWeight: 900, 
              color: securityScore >= 80 ? 'var(--green)' : securityScore >= 60 ? 'var(--yellow)' : 'var(--red)' 
            }}>
              {securityScore}%
            </div>
            <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1.25rem', marginTop: 12 }}>
              Security Index
            </div>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
              {securityScore >= 80 ? 'Platform is highly secure.' : 'Security improvements recommended.'}
            </p>
          </div>

          <div className="card">
            <h3 className="mb-24">Security Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {securityResults.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', background: 'var(--bg-sunken)',
                  borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.passed ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{item.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{item.severity}</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 800, padding: '4px 12px',
                    borderRadius: 'var(--radius-pill)',
                    background: item.passed ? 'var(--green-bg)' : 'var(--red-bg)',
                    color: item.passed ? 'var(--green)' : 'var(--red)',
                  }}>
                    {item.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ServiceBadge({ label, status }) {
  return (
    <div style={{ 
      display: 'flex', alignItems: 'center', gap: 8, 
      background: 'var(--overlay-1)', border: '1px solid var(--border-strong)',
      padding: '6px 14px', borderRadius: 'var(--radius-pill)',
      fontSize: '0.8rem', fontWeight: '700'
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: status ? 'var(--green)' : 'var(--red)' }} />
      {label}
    </div>
  )
}

function MetricCard({ label, value, sub, color, icon }) {
  return (
    <div className="card stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ fontSize: '1.5rem' }}>{icon}</div>
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div style={{ fontSize: '2.2rem', fontWeight: 800, color: color || 'var(--text-heading)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: '600' }}>{sub}</div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding: '16px', background: 'var(--overlay-1)', borderRadius: 'var(--radius)', border: '1px solid var(--border-strong)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-heading)' }}>{value}</div>
    </div>
  )
}
