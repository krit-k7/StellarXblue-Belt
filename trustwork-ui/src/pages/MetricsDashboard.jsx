import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchPlatformMetrics, getLocalMetrics } from '../utils/analytics'
import { runSecurityChecklist, getSecurityScore } from '../utils/security'
import { generateMonitoringReport, getPerformanceStats, getUptime } from '../utils/monitoring'
import { RPC_URL, CONTRACT_ID } from '../utils/stellar'
import { formatXLM } from '../utils/contract'
import { BoltIcon, ShieldCheckIcon, HistoryIcon, PackageIcon } from '../components/icons'

const REFRESH_INTERVAL = 30000

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function MetricsDashboard({ contracts, wallet }) {
  const [platformMetrics, setPlatformMetrics] = useState(null)
  const [localMetrics, setLocalMetrics]       = useState(null)
  const [healthReport, setHealthReport]       = useState(null)
  const [securityResults, setSecurityResults] = useState([])
  const [securityScore, setSecurityScore]     = useState(0)
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
    <motion.div 
      className="page"
      initial="hidden"
      animate="show"
      variants={container}
    >
      {/* Header */}
      <motion.div className="flex-between mb-32" variants={item}>
        <div>
          <h2 className="page-title" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Platform Metrics</h2>
          <p className="page-subtitle">
            Real-time analytics and system health monitoring
            {lastRefresh && (
              <span style={{ marginLeft: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Updated: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <motion.button 
          className="btn btn-outline btn-sm" 
          onClick={refresh} 
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{ borderRadius: '10px' }}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </motion.button>
      </motion.div>

      {/* System Status */}
      <motion.div 
        variants={item}
        style={{
          background: 'var(--bg-card)',
          border: `1px solid ${statusColor[overall]}33`,
          borderRadius: 'var(--radius)',
          padding: '24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 48, height: 48, borderRadius: '50%', 
            background: `${statusColor[overall]}22`, 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: statusColor[overall], fontSize: '1.5rem'
          }}>
            {overall === 'healthy' ? '✓' : '!'}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: statusColor[overall], fontSize: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System {overall}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Uptime: {uptime?.formatted || '—'} · Health Score: {healthReport?.score ?? '—'}%
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <ServiceBadge label="Stellar RPC" status={health.rpc?.healthy} />
          <ServiceBadge label="Smart Contract" status={!!CONTRACT_ID} />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div className="tabs" variants={item} style={{ marginBottom: 32, padding: '6px', borderRadius: '14px' }}>
        {['overview', 'contracts', 'security'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ borderRadius: '10px', textTransform: 'capitalize', padding: '10px 24px' }}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div className="stats-grid">
              <MetricCard label="Total Users" value={platformMetrics?.totalUsers ?? '—'} icon={<BoltIcon />} color="var(--accent)" />
              <MetricCard label="Total Volume" value={local.totalVolume?.toLocaleString() ?? '—'} sub="XLM Escrowed" icon={<PackageIcon />} color="var(--green)" />
              <MetricCard label="Contracts" value={local.totalContracts ?? '—'} icon={<HistoryIcon />} color="var(--purple)" />
              <MetricCard label="Success Rate" value={`${local.successRate ?? 0}%`} icon={<ShieldCheckIcon />} color="var(--green)" />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--green)' }}>{securityScore}%</div>
                <div style={{ color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Security Score</div>
              </div>
              <div style={{ display: 'grid', gap: '12px' }}>
                {securityResults.map(res => (
                  <div key={res.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--overlay-1)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600 }}>{res.label}</span>
                    <span style={{ color: res.passed ? 'var(--green)' : 'var(--red)' }}>{res.passed ? 'PASSED' : 'FAILED'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function ServiceBadge({ label, status }) {
  return (
    <div style={{ 
      padding: '6px 12px', borderRadius: '8px', background: 'var(--overlay-1)', 
      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: status ? 'var(--green)' : 'var(--red)' }} />
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-heading)' }}>{label}</span>
    </div>
  )
}

function MetricCard({ label, value, sub, icon, color }) {
  return (
    <div className="card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05, fontSize: '5rem', color }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px' }}>{label}</div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}
