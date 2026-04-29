// =============================================================================
// monitoring.js — Application health monitoring, uptime tracking, performance
// Tracks: API response times, error rates, contract success rates, uptime
// =============================================================================

import { getSupabase } from '../lib/supabase'

// ── Performance monitoring ────────────────────────────────────────────────────
const performanceMetrics = {
  rpcLatency: [],
  txConfirmTime: [],
  pageLoadTime: null,
}

export function recordRpcLatency(ms) {
  performanceMetrics.rpcLatency.push({ ms, ts: Date.now() })
  if (performanceMetrics.rpcLatency.length > 50) {
    performanceMetrics.rpcLatency.shift()
  }
}

export function recordTxConfirmTime(ms) {
  performanceMetrics.txConfirmTime.push({ ms, ts: Date.now() })
  if (performanceMetrics.txConfirmTime.length > 20) {
    performanceMetrics.txConfirmTime.shift()
  }
}

export function recordPageLoad() {
  if (window.performance) {
    const nav = window.performance.getEntriesByType('navigation')[0]
    if (nav) {
      performanceMetrics.pageLoadTime = Math.round(nav.loadEventEnd - nav.startTime)
    }
  }
}

export function getPerformanceStats() {
  const rpc = performanceMetrics.rpcLatency
  const tx = performanceMetrics.txConfirmTime

  const avg = (arr) => arr.length ? Math.round(arr.reduce((s, x) => s + x.ms, 0) / arr.length) : null
  const max = (arr) => arr.length ? Math.max(...arr.map(x => x.ms)) : null
  const min = (arr) => arr.length ? Math.min(...arr.map(x => x.ms)) : null

  return {
    rpc: {
      avg: avg(rpc),
      max: max(rpc),
      min: min(rpc),
      samples: rpc.length,
    },
    tx: {
      avg: avg(tx),
      max: max(tx),
      min: min(tx),
      samples: tx.length,
    },
    pageLoad: performanceMetrics.pageLoadTime,
  }
}

// ── Health checks ─────────────────────────────────────────────────────────────
export async function checkRpcHealth(rpcUrl) {
  const start = Date.now()
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    recordRpcLatency(latency)
    const data = await res.json()
    return {
      healthy: res.ok && data.result === 'healthy',
      latency,
      status: data.result || 'unknown',
    }
  } catch (err) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: err.message,
    }
  }
}

export async function checkSupabaseHealth() {
  try {
    const supabase = await getSupabase()
    if (!supabase) return { healthy: false, reason: 'not_configured' }
    const start = Date.now()
    const { error } = await supabase.from('users').select('count').limit(1)
    return {
      healthy: !error,
      latency: Date.now() - start,
      error: error?.message,
    }
  } catch (err) {
    return { healthy: false, error: err.message }
  }
}

export async function checkFreighterHealth() {
  try {
    const { isConnected } = await import('@stellar/freighter-api')
    const result = await isConnected()
    return {
      healthy: true,
      installed: result?.isConnected ?? false,
    }
  } catch {
    return { healthy: false, installed: false }
  }
}

export async function runHealthChecks(rpcUrl) {
  const [rpc, supabase, freighter] = await Promise.all([
    checkRpcHealth(rpcUrl),
    checkSupabaseHealth(),
    checkFreighterHealth(),
  ])

  const allHealthy = rpc.healthy && supabase.healthy !== false
  const score = [rpc.healthy, supabase.healthy !== false, freighter.installed]
    .filter(Boolean).length

  return {
    overall: allHealthy ? 'healthy' : score > 0 ? 'degraded' : 'down',
    score: Math.round((score / 3) * 100),
    checks: { rpc, supabase, freighter },
    ts: new Date().toISOString(),
  }
}

// ── Uptime tracking ───────────────────────────────────────────────────────────
let _uptimeStart = Date.now()
let _lastHealthCheck = null

export function getUptime() {
  const ms = Date.now() - _uptimeStart
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return { ms, hours, minutes, seconds, formatted: `${hours}h ${minutes}m ${seconds}s` }
}

export function setLastHealthCheck(result) {
  _lastHealthCheck = result
}

export function getLastHealthCheck() {
  return _lastHealthCheck
}

// ── Error rate monitoring ─────────────────────────────────────────────────────
const errorWindow = []

export function recordError(type, message) {
  const now = Date.now()
  errorWindow.push({ type, message, ts: now })
  // Keep only last 5 minutes
  const cutoff = now - 300000
  while (errorWindow.length > 0 && errorWindow[0].ts < cutoff) {
    errorWindow.shift()
  }
}

export function getErrorRate() {
  const now = Date.now()
  const oneMin = errorWindow.filter(e => e.ts > now - 60000).length
  const fiveMin = errorWindow.length
  return { perMinute: oneMin, perFiveMinutes: fiveMin }
}

// ── Monitoring report ─────────────────────────────────────────────────────────
export async function generateMonitoringReport(rpcUrl) {
  const [health, perf, errors, uptime] = await Promise.all([
    runHealthChecks(rpcUrl),
    Promise.resolve(getPerformanceStats()),
    Promise.resolve(getErrorRate()),
    Promise.resolve(getUptime()),
  ])

  const report = {
    generated_at: new Date().toISOString(),
    uptime,
    health,
    performance: perf,
    errors,
    status: health.overall,
  }

  // Persist to Supabase
  try {
    const supabase = await getSupabase()
    if (supabase) {
      await supabase.from('monitoring_reports').insert([{
        status: report.status,
        health_score: health.score,
        rpc_latency: perf.rpc.avg,
        error_rate: errors.perMinute,
        report_data: JSON.stringify(report),
        ts: report.generated_at,
      }])
    }
  } catch { /* non-critical */ }

  return report
}
