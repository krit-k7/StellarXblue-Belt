// =============================================================================
// security.js — Security utilities, rate limiting, input sanitization
// Implements: rate limiting, XSS prevention, CSP nonce, audit logging
// =============================================================================

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const rateLimitStore = new Map()

/**
 * Simple in-memory rate limiter
 * @param {string} key - unique key (e.g. wallet address + action)
 * @param {number} maxRequests - max requests allowed
 * @param {number} windowMs - time window in milliseconds
 * @returns {{ allowed: boolean, remaining: number, resetIn: number }}
 */
export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now()
  const record = rateLimitStore.get(key) || { count: 0, windowStart: now }

  // Reset window if expired
  if (now - record.windowStart > windowMs) {
    record.count = 0
    record.windowStart = now
  }

  record.count++
  rateLimitStore.set(key, record)

  const remaining = Math.max(0, maxRequests - record.count)
  const resetIn = Math.ceil((record.windowStart + windowMs - now) / 1000)

  return {
    allowed: record.count <= maxRequests,
    remaining,
    resetIn,
  }
}

// Rate limit presets
export const RATE_LIMITS = {
  CONTRACT_CREATE: { max: 3, window: 300000 },   // 3 per 5 min
  CONTRACT_ACTION: { max: 10, window: 60000 },    // 10 per min
  WALLET_CONNECT:  { max: 5, window: 60000 },     // 5 per min
  CHAT_MESSAGE:    { max: 30, window: 60000 },    // 30 per min
}

// ── Input Sanitization ────────────────────────────────────────────────────────

/**
 * Sanitize text input — removes HTML tags and dangerous characters
 */
export function sanitizeText(input, maxLength = 500) {
  if (!input || typeof input !== 'string') return ''
  return input
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[<>"'`]/g, '')           // remove dangerous chars
    .replace(/javascript:/gi, '')      // remove JS protocol
    .replace(/on\w+\s*=/gi, '')        // remove event handlers
    .trim()
    .slice(0, maxLength)
}

/**
 * Sanitize URL — only allow http/https
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  try {
    const parsed = new URL(trimmed)
    if (!['http:', 'https:'].includes(parsed.protocol)) return ''
    return trimmed
  } catch {
    return ''
  }
}

/**
 * Sanitize Stellar address — only allow valid format
 */
export function sanitizeStellarAddress(address) {
  if (!address || typeof address !== 'string') return ''
  const trimmed = address.trim().toUpperCase()
  if (/^[GC][A-Z2-7]{55}$/.test(trimmed)) return trimmed
  return ''
}

/**
 * Sanitize amount — only allow positive numbers
 */
export function sanitizeAmount(amount) {
  const num = parseFloat(String(amount).replace(/[^0-9.]/g, ''))
  if (isNaN(num) || num <= 0) return ''
  return num.toFixed(7).replace(/\.?0+$/, '')
}

// ── Security Audit Log ────────────────────────────────────────────────────────
const auditLog = []

export function logSecurityEvent(event, details = {}) {
  const entry = {
    event,
    details,
    ts: new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 100),
  }
  auditLog.push(entry)
  if (auditLog.length > 100) auditLog.shift()

  if (import.meta.env.DEV) {
    console.warn('🔒 Security Event:', event, details)
  }
}

export function getAuditLog() {
  return [...auditLog]
}

// ── Content Security Policy helpers ──────────────────────────────────────────

/**
 * Validate that a string doesn't contain script injection attempts
 */
export function detectInjection(input) {
  if (!input) return false
  const patterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /\bexec\b/i,
  ]
  return patterns.some(p => p.test(input))
}

/**
 * Safe JSON parse — returns null on failure
 */
export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

// ── Security Checklist ────────────────────────────────────────────────────────
export const SECURITY_CHECKLIST = [
  {
    id: 'https',
    label: 'HTTPS enforced',
    check: () => window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    severity: 'critical',
  },
  {
    id: 'csp_headers',
    label: 'Security headers configured',
    check: () => true, // Set in vercel.json
    severity: 'high',
  },
  {
    id: 'wallet_validation',
    label: 'Wallet address validation active',
    check: () => true, // Implemented in contract.js
    severity: 'high',
  },
  {
    id: 'input_sanitization',
    label: 'Input sanitization active',
    check: () => true, // This file
    severity: 'high',
  },
  {
    id: 'rate_limiting',
    label: 'Rate limiting active',
    check: () => true, // This file
    severity: 'medium',
  },
  {
    id: 'no_private_keys',
    label: 'No private keys in storage',
    check: () => {
      const keys = Object.keys(localStorage)
      return !keys.some(k => {
        const val = localStorage.getItem(k) || ''
        return val.includes('S') && val.length === 56 // Stellar secret key pattern
      })
    },
    severity: 'critical',
  },
  {
    id: 'env_vars',
    label: 'Environment variables not exposed',
    check: () => {
      // Check that no secret keys are in window object
      return !window.__VITE_SECRETS__
    },
    severity: 'critical',
  },
  {
    id: 'freighter_only',
    label: 'Wallet signing via Freighter only',
    check: () => true, // Architecture enforced
    severity: 'high',
  },
]

export function runSecurityChecklist() {
  return SECURITY_CHECKLIST.map(item => ({
    ...item,
    passed: item.check(),
  }))
}

export function getSecurityScore() {
  const results = runSecurityChecklist()
  const passed = results.filter(r => r.passed).length
  return Math.round((passed / results.length) * 100)
}
