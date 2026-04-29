// =============================================================================
// analytics.js — User tracking, metrics, and event logging
// Tracks: page views, contract events, user sessions, errors
// Data stored in Supabase (if configured) + localStorage fallback
// =============================================================================

import { getSupabase } from '../lib/supabase'

// ── Session management ────────────────────────────────────────────────────────
let _sessionId = null
let _walletAddress = null

function getSessionId() {
  if (_sessionId) return _sessionId
  _sessionId = sessionStorage.getItem('tw_session_id')
  if (!_sessionId) {
    _sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)
    sessionStorage.setItem('tw_session_id', _sessionId)
  }
  return _sessionId
}

export function setAnalyticsWallet(address) {
  _walletAddress = address
}

// ── Core event tracker ────────────────────────────────────────────────────────
async function trackEvent(eventName, properties = {}) {
  const event = {
    event_name: eventName,
    wallet_address: _walletAddress || null,
    session_id: getSessionId(),
    properties: JSON.stringify(properties),
    page: window.location.pathname + window.location.hash,
    user_agent: navigator.userAgent.slice(0, 200),
    ts: new Date().toISOString(),
  }

  // Always log to console in dev
  if (import.meta.env.DEV) {
    console.log('📊 Analytics:', eventName, properties)
  }

  // Store locally for offline support
  try {
    const key = 'tw_analytics_queue'
    const queue = JSON.parse(localStorage.getItem(key) || '[]')
    queue.push(event)
    // Keep last 200 events locally
    if (queue.length > 200) queue.splice(0, queue.length - 200)
    localStorage.setItem(key, JSON.stringify(queue))
  } catch { /* storage full */ }

  // Send to Supabase if available
  try {
    const supabase = await getSupabase()
    if (supabase) {
      await supabase.from('analytics_events').insert([event])
    }
  } catch { /* analytics should never break the app */ }
}

// ── User registration / verification ─────────────────────────────────────────
export async function trackUserConnect(walletAddress, network) {
  setAnalyticsWallet(walletAddress)

  // Register user in Supabase users table
  try {
    const supabase = await getSupabase()
    if (supabase) {
      const { data: existing } = await supabase
        .from('users')
        .select('id, visit_count, first_seen')
        .eq('wallet_address', walletAddress)
        .single()

      if (existing) {
        // Update returning user
        await supabase
          .from('users')
          .update({
            last_seen: new Date().toISOString(),
            visit_count: (existing.visit_count || 0) + 1,
            network,
          })
          .eq('wallet_address', walletAddress)
      } else {
        // Register new user
        await supabase.from('users').insert([{
          wallet_address: walletAddress,
          network,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          visit_count: 1,
          is_verified: true, // wallet connection = verified
        }])
      }
    }
  } catch { /* non-critical */ }

  await trackEvent('wallet_connected', { wallet: walletAddress, network })
}

export async function trackUserDisconnect() {
  await trackEvent('wallet_disconnected', { wallet: _walletAddress })
  setAnalyticsWallet(null)
}

// ── Page tracking ─────────────────────────────────────────────────────────────
export async function trackPageView(pageName) {
  await trackEvent('page_view', { page: pageName })
}

// ── Contract event tracking ───────────────────────────────────────────────────
export async function trackContractCreated(contractId, amount, hasArbitrator, milestoneCount) {
  await trackEvent('contract_created', {
    contract_id: contractId,
    amount_xlm: amount,
    has_arbitrator: hasArbitrator,
    milestone_count: milestoneCount,
  })
  await updatePlatformMetrics('contracts_created')
}

export async function trackContractDeposit(contractId, amount) {
  await trackEvent('contract_deposit', { contract_id: contractId, amount_xlm: amount })
  await updatePlatformMetrics('total_volume', Number(amount))
}

export async function trackWorkSubmitted(contractId) {
  await trackEvent('work_submitted', { contract_id: contractId })
}

export async function trackContractApproved(contractId, amount) {
  await trackEvent('contract_approved', { contract_id: contractId, amount_xlm: amount })
  await updatePlatformMetrics('contracts_completed')
}

export async function trackDisputeRaised(contractId) {
  await trackEvent('dispute_raised', { contract_id: contractId })
  await updatePlatformMetrics('disputes_raised')
}

export async function trackDisputeResolved(contractId, resolution) {
  await trackEvent('dispute_resolved', { contract_id: contractId, resolution })
}

// ── Error tracking ────────────────────────────────────────────────────────────
export async function trackError(errorType, errorMessage, context = {}) {
  await trackEvent('error', {
    error_type: errorType,
    error_message: String(errorMessage).slice(0, 500),
    ...context,
  })

  // Store in errors table for monitoring
  try {
    const supabase = await getSupabase()
    if (supabase) {
      await supabase.from('error_logs').insert([{
        error_type: errorType,
        error_message: String(errorMessage).slice(0, 500),
        wallet_address: _walletAddress,
        context: JSON.stringify(context),
        ts: new Date().toISOString(),
      }])
    }
  } catch { /* non-critical */ }
}

// ── Platform metrics aggregation ─────────────────────────────────────────────
async function updatePlatformMetrics(metric, value = 1) {
  try {
    const supabase = await getSupabase()
    if (!supabase) return

    const today = new Date().toISOString().split('T')[0]
    const { data: existing } = await supabase
      .from('platform_metrics')
      .select('id, value')
      .eq('metric_name', metric)
      .eq('date', today)
      .single()

    if (existing) {
      await supabase
        .from('platform_metrics')
        .update({ value: existing.value + value })
        .eq('id', existing.id)
    } else {
      await supabase.from('platform_metrics').insert([{
        metric_name: metric,
        value,
        date: today,
      }])
    }
  } catch { /* non-critical */ }
}

// ── Metrics fetching for dashboard ───────────────────────────────────────────
export async function fetchPlatformMetrics() {
  try {
    const supabase = await getSupabase()
    if (!supabase) return null

    const [usersResult, metricsResult, errorsResult] = await Promise.all([
      supabase.from('users').select('wallet_address, first_seen, last_seen, visit_count, network', { count: 'exact' }),
      supabase.from('platform_metrics').select('*').order('date', { ascending: false }).limit(30),
      supabase.from('error_logs').select('error_type, ts').order('ts', { ascending: false }).limit(50),
    ])

    const users = usersResult.data || []
    const metrics = metricsResult.data || []
    const errors = errorsResult.data || []

    // Aggregate metrics by name
    const metricTotals = {}
    metrics.forEach(m => {
      metricTotals[m.metric_name] = (metricTotals[m.metric_name] || 0) + m.value
    })

    // Daily active users (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const activeUsers = users.filter(u => u.last_seen > sevenDaysAgo).length

    // Error rate (last 24h)
    const oneDayAgo = new Date(Date.now() - 86400000).toISOString()
    const recentErrors = errors.filter(e => e.ts > oneDayAgo).length

    // Daily metrics for chart (last 7 days)
    const dailyData = buildDailyChart(metrics, 7)

    return {
      totalUsers: usersResult.count || users.length,
      activeUsers,
      contractsCreated: metricTotals['contracts_created'] || 0,
      contractsCompleted: metricTotals['contracts_completed'] || 0,
      totalVolume: metricTotals['total_volume'] || 0,
      disputesRaised: metricTotals['disputes_raised'] || 0,
      recentErrors,
      dailyData,
      recentUsers: users.slice(0, 10),
      errorBreakdown: buildErrorBreakdown(errors),
    }
  } catch (err) {
    console.error('fetchPlatformMetrics error:', err)
    return null
  }
}

function buildDailyChart(metrics, days) {
  const result = []
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    const dayMetrics = metrics.filter(m => m.date === date)
    const contracts = dayMetrics.find(m => m.metric_name === 'contracts_created')?.value || 0
    const volume = dayMetrics.find(m => m.metric_name === 'total_volume')?.value || 0
    result.push({ date, contracts, volume })
  }
  return result
}

function buildErrorBreakdown(errors) {
  const counts = {}
  errors.forEach(e => {
    counts[e.error_type] = (counts[e.error_type] || 0) + 1
  })
  return Object.entries(counts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
}

// ── Local metrics (fallback when Supabase not configured) ─────────────────────
export function getLocalMetrics(contracts, wallet) {
  const completed = contracts.filter(c => c.status === 'COMPLETED')
  const disputed = contracts.filter(c => c.status === 'DISPUTED')
  const active = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'SUBMITTED')
  const totalVolume = contracts.reduce((sum, c) => sum + Number(c.amount || 0), 0)
  const completedVolume = completed.reduce((sum, c) => sum + Number(c.amount || 0), 0)

  // Avg completion time
  const completionTimes = completed
    .filter(c => c.createdAt && c.completedAt)
    .map(c => (new Date(c.completedAt) - new Date(c.createdAt)) / 86400000)
  const avgCompletionDays = completionTimes.length
    ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
    : null

  return {
    totalContracts: contracts.length,
    activeContracts: active.length,
    completedContracts: completed.length,
    disputedContracts: disputed.length,
    totalVolume,
    completedVolume,
    disputeRate: contracts.length ? ((disputed.length / contracts.length) * 100).toFixed(1) : 0,
    successRate: contracts.length ? ((completed.length / contracts.length) * 100).toFixed(1) : 0,
    avgCompletionDays,
    asClient: contracts.filter(c => c.client === wallet).length,
    asFreelancer: contracts.filter(c => c.freelancer === wallet).length,
  }
}
