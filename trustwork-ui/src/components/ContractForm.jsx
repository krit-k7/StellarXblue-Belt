// =============================================================================
// ContractForm.jsx — Multi-step contract builder
// Step 1: Choose template
// Step 2: Parties & payment
// Step 3: Terms & conditions (framework options)
// Step 4: Review & deploy
// =============================================================================

import { useState } from 'react'
import { CONTRACT_TEMPLATES, REFUND_POLICY_LABELS, reviewPeriodLabel } from '../utils/contractTemplates'
import { truncateAddr, formatXLM, validateContractForm } from '../utils/contract'

const STEPS = ['Template', 'Parties & Payment', 'Terms', 'Review & Deploy']

const INITIAL_FORM = {
  // Step 1
  template: null,
  // Step 2
  title: '',
  freelancer: '',
  amount: '',
  token: 'XLM',
  // Step 3
  deadline: '',
  reviewPeriod: '7',
  enableArbitrator: false,
  arbitrator: '',
  autoReleaseOnDeadline: true,
  refundPolicy: 'pre_submit',
  enableMilestones: false,
  milestones: [{ label: '', pct: 100 }],
  splitOnDispute: false,
  desc: '',
}

export default function ContractForm({ onSubmit, loading, wallet }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})

  // ── Helpers ────────────────────────────────────────────────────────────────
  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function applyTemplate(tpl) {
    setForm(f => ({ ...f, template: tpl.id, ...tpl.defaults }))
    setStep(1)
  }

  // ── Validation per step ────────────────────────────────────────────────────
  function validateStep(s) {
    const e = {}
    
    // Step 1: Parties & Payment
    if (s === 1) {
      if (!form.title?.trim()) {
        e.title = 'Project title is required'
      } else if (form.title.trim().length < 3) {
        e.title = 'Title must be at least 3 characters'
      } else if (form.title.trim().length > 100) {
        e.title = 'Title must be less than 100 characters'
      }
      
      if (!form.freelancer?.trim()) {
        e.freelancer = 'Freelancer address is required'
      } else if (form.freelancer.length < 10) {
        e.freelancer = 'Enter a valid Stellar address'
      } else if (form.freelancer === wallet) {
        e.freelancer = 'Cannot be your own address'
      }
      
      const amount = Number(form.amount)
      if (!form.amount || isNaN(amount)) {
        e.amount = 'Amount is required'
      } else if (amount <= 0) {
        e.amount = 'Must be greater than 0'
      }
    }
    
    // Step 2: Terms & Conditions
    if (s === 2) {
      if (!form.deadline) {
        e.deadline = 'Deadline is required'
      } else {
        const deadlineDate = new Date(form.deadline)
        const now = new Date()
        if (deadlineDate <= now) {
          e.deadline = 'Must be in the future'
        }
      }
      
      if (form.enableArbitrator && !form.arbitrator?.trim()) {
        e.arbitrator = 'Enter arbitrator address'
      }
      
      if (form.enableMilestones) {
        const total = form.milestones.reduce((sum, m) => sum + Number(m.pct || 0), 0)
        if (Math.abs(total - 100) > 0.01) {
          e.milestones = `Milestone percentages must total 100% (currently ${total}%)`
        }
        form.milestones.forEach((m, i) => {
          if (!m.label?.trim()) {
            e[`ms_${i}`] = 'Label required'
          }
          if (Number(m.pct || 0) <= 0) {
            e[`ms_${i}_pct`] = 'Percentage must be greater than 0%'
          }
        })
        
        // Check if there are any valid milestones
        const validMilestones = form.milestones.filter(m => Number(m.pct || 0) > 0)
        if (validMilestones.length === 0) {
          e.milestones = 'At least one milestone must have a percentage greater than 0%'
        }
      }
    }
    
    return e
  }

  function next() {
    const e = validateStep(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(s => s + 1)
  }

  function back() { setStep(s => s - 1); setErrors({}) }

  function handleSubmit() {
    try {
      // Final comprehensive validation before submission
      const errors = validateContractForm(form, wallet)
      if (Object.keys(errors).length > 0) {
        setErrors(errors)
        // Go back to the first step with errors
        if (errors.title || errors.freelancer || errors.amount) {
          setStep(1)
        } else if (errors.deadline || errors.arbitrator || errors.milestones) {
          setStep(2)
        }
        return
      }
      onSubmit(form)
    } catch (error) {
      console.error('Form validation error:', error)
      setErrors({ submit: 'An error occurred while validating the form. Please check all fields and try again.' })
    }
  }

  // ── Milestone helpers ──────────────────────────────────────────────────────
  function addMilestone() {
    setForm(f => ({ ...f, milestones: [...f.milestones, { label: '', pct: 0 }] }))
  }
  function removeMilestone(i) {
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }))
  }
  function setMilestone(i, field, value) {
    setForm(f => {
      const ms = [...f.milestones]
      ms[i] = { ...ms[i], [field]: value }
      return { ...f, milestones: ms }
    })
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 32 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < STEPS.length - 1 && (
              <div style={{
                position: 'absolute', top: 15, left: '50%', width: '100%', height: 2,
                background: i < step ? 'var(--accent)' : 'var(--border)',
              }} />
            )}
            <div className="step-progress-circle" style={{
              width: 30, height: 30, borderRadius: '50%', zIndex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700,
              background: i < step ? 'var(--accent)' : i === step ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
              border: `2px solid ${i <= step ? 'var(--accent)' : 'var(--border)'}`,
              color: i < step ? '#fff' : i === step ? 'var(--accent)' : 'var(--text-muted)',
              boxShadow: i === step ? '0 0 0 4px var(--accent-glow)' : 'none',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <div className="step-progress-label" style={{
              fontSize: '0.7rem', marginTop: 6, textAlign: 'center',
              color: i <= step ? 'var(--accent)' : 'var(--text-muted)',
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── STEP 0: Template picker ── */}
      {step === 0 && (
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
            Choose a starting template or build from scratch. You can customize everything in the next steps.
          </p>
          <div className="template-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {CONTRACT_TEMPLATES.map(tpl => (
              <div
                key={tpl.id}
                className="card card-clickable"
                style={{
                  border: form.template === tpl.id ? '1px solid var(--accent)' : undefined,
                  boxShadow: form.template === tpl.id ? '0 0 0 1px var(--accent-glow)' : undefined,
                  padding: 18,
                }}
                onClick={() => applyTemplate(tpl)}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{tpl.icon}</div>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: 6 }}>{tpl.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{tpl.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1: Parties & Payment ── */}
      {step === 1 && (
        <div>
          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input className="form-input" placeholder="e.g. DeFi Dashboard UI" value={form.title} onChange={e => set('title', e.target.value)} />
            {errors.title && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.title}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Freelancer Stellar Address</label>
            <input className="form-input" placeholder="G..." value={form.freelancer} onChange={e => set('freelancer', e.target.value)} />
            <span className="form-hint">The public key of the freelancer's Stellar wallet (G...)</span>
            {errors.freelancer && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.freelancer}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Payment Amount</label>
              <input className="form-input" type="number" placeholder="0" min="1" value={form.amount} onChange={e => set('amount', e.target.value)} />
              {errors.amount && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.amount}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Token</label>
              <select className="form-select" value={form.token} onChange={e => set('token', e.target.value)}>
                <option value="XLM">XLM (Native Stellar)</option>
                <option value="USDC">USDC (Circle)</option>
                <option value="custom">Custom SAC Address</option>
              </select>
            </div>
          </div>

          {form.token === 'custom' && (
            <div className="form-group">
              <label className="form-label">Token Contract Address (SAC)</label>
              <input className="form-input" placeholder="C..." value={form.customToken || ''} onChange={e => set('customToken', e.target.value)} />
              <span className="form-hint">Stellar Asset Contract address for any SEP-41 token</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Project Description & Requirements</label>
            <textarea className="form-textarea" placeholder="Describe scope, deliverables, and acceptance criteria..." value={form.desc} onChange={e => set('desc', e.target.value)} rows={4} />
          </div>
        </div>
      )}

      {/* ── STEP 2: Terms & Conditions ── */}
      {step === 2 && (
        <div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Project Deadline</label>
              <input className="form-input" type="date" min={minDate} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
              <span className="form-hint">Seller can auto-claim after this date if buyer is inactive</span>
              {errors.deadline && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.deadline}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Review Period</label>
              <select className="form-select" value={form.reviewPeriod} onChange={e => set('reviewPeriod', e.target.value)}>
                {[3, 5, 7, 10, 14, 21, 30].map(d => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
              <span className="form-hint">Time buyer has to review submitted work</span>
            </div>
          </div>

          {/* Refund Policy */}
          <div className="form-group">
            <label className="form-label">Refund Policy</label>
            <select className="form-select" value={form.refundPolicy} onChange={e => set('refundPolicy', e.target.value)}>
              {Object.entries(REFUND_POLICY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {/* Auto-release toggle */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem' }}>Auto-Release After Deadline</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Seller can claim payment if buyer doesn't respond after the review period
                </div>
              </div>
              <Toggle value={form.autoReleaseOnDeadline} onChange={v => set('autoReleaseOnDeadline', v)} />
            </div>
          </div>

          {/* Arbitrator toggle */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.enableArbitrator ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem' }}>Enable Arbitrator</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  A trusted third party who can resolve disputes between buyer and seller
                </div>
              </div>
              <Toggle value={form.enableArbitrator} onChange={v => set('enableArbitrator', v)} />
            </div>
            {form.enableArbitrator && (
              <div className="form-group" style={{ marginBottom: 0, marginTop: 12 }}>
                <input className="form-input" placeholder="Arbitrator Stellar address (G...)" value={form.arbitrator} onChange={e => set('arbitrator', e.target.value)} />
                {errors.arbitrator && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.arbitrator}</span>}
              </div>
            )}
          </div>

          {/* Split on dispute toggle */}
          {form.enableArbitrator && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem' }}>Allow Split Resolution</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    Arbitrator can split funds between parties (e.g. 70/30) instead of all-or-nothing
                  </div>
                </div>
                <Toggle value={form.splitOnDispute} onChange={v => set('splitOnDispute', v)} />
              </div>
            </div>
          )}

          {/* Milestones toggle */}
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: form.enableMilestones ? 14 : 0 }}>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem' }}>Milestone-Based Payment</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                  Split the total into milestones — each becomes a separate escrow instance on-chain
                </div>
              </div>
              <Toggle value={form.enableMilestones} onChange={v => set('enableMilestones', v)} />
            </div>

            {form.enableMilestones && (
              <div style={{ marginTop: 12 }}>
                {form.milestones.map((ms, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <input
                        className="form-input"
                        placeholder={`Milestone ${i + 1} label`}
                        value={ms.label}
                        onChange={e => setMilestone(i, 'label', e.target.value)}
                      />
                      {errors[`ms_${i}`] && <span style={{ color: 'var(--red)', fontSize: '0.75rem' }}>{errors[`ms_${i}`]}</span>}
                    </div>
                    <div style={{ width: 80 }}>
                      <input
                        className="form-input"
                        type="number"
                        placeholder="%"
                        min="1" max="100"
                        value={ms.pct}
                        onChange={e => setMilestone(i, 'pct', e.target.value)}
                        style={{ textAlign: 'center' }}
                      />
                      {errors[`ms_${i}_pct`] && <span style={{ color: 'var(--red)', fontSize: '0.75rem', display: 'block', marginTop: 2 }}>{errors[`ms_${i}_pct`]}</span>}
                    </div>
                    {form.milestones.length > 1 && (
                      <button className="btn btn-danger btn-sm" onClick={() => removeMilestone(i)} style={{ marginTop: 0 }}>✕</button>
                    )}
                  </div>
                ))}
                {errors.milestones && (
                  <div style={{ color: 'var(--red)', fontSize: '0.8rem', marginBottom: 8 }}>{errors.milestones}</div>
                )}
                <button className="btn btn-secondary btn-sm" onClick={addMilestone}>+ Add Milestone</button>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Total: {form.milestones.reduce((s, m) => s + Number(m.pct || 0), 0)}% (must equal 100%)
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Deploy ── */}
      {step === 3 && (
        <ContractPreview form={form} wallet={wallet} onDeploy={handleSubmit} loading={loading} errors={errors} />
      )}

      {/* ── Navigation ── */}
      {step < 3 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          {step > 0 ? (
            <button className="btn btn-secondary" onClick={back}>← Back</button>
          ) : <div />}
          {step > 0 && (
            <button className="btn btn-primary" onClick={next}>
              {step === 2 ? 'Review Contract →' : 'Next →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Toggle component ──────────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--border)',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        boxShadow: value ? '0 0 8px var(--accent-glow)' : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}

// ── ContractPreview ───────────────────────────────────────────────────────────
// Shows a full summary of what will be deployed to the Soroban contract.
function ContractPreview({ form, wallet, onDeploy, loading, errors }) {
  const totalAmount = Number(form.amount) || 0
  const tpl = CONTRACT_TEMPLATES.find(t => t.id === form.template)

  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: 20 }}>
        ⚡ Review your contract configuration before deploying to Stellar. This cannot be changed after funding.
      </div>

      {/* Validation errors */}
      {errors?.submit && (
        <div className="alert alert-danger" style={{ marginBottom: 20 }}>
          ⚠️ {errors.submit}
        </div>
      )}

      {/* Escrow amount visual */}
      <div className="escrow-visual" style={{ marginBottom: 20 }}>
        <div className="escrow-amount">{formatXLM(totalAmount)}</div>
        <div className="escrow-label">Will be locked in Soroban escrow</div>
        <div className="escrow-locked">🔒 {form.token} · Stellar Network</div>
      </div>

      {/* Contract summary card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="detail-section-title">Contract Details</div>

        <PreviewRow label="Template" value={tpl ? `${tpl.icon} ${tpl.label}` : '—'} />
        <PreviewRow label="Title" value={form.title} />
        <PreviewRow label="Client (You)" value={truncateAddr(wallet)} mono />
        <PreviewRow label="Freelancer" value={truncateAddr(form.freelancer)} mono />
        <PreviewRow label="Amount" value={`${totalAmount.toLocaleString()} ${form.token}`} accent />
        <PreviewRow label="Deadline" value={form.deadline || '—'} />
        <PreviewRow label="Review Period" value={`${form.reviewPeriod} days`} />
      </div>

      {/* Terms card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="detail-section-title">Contract Terms</div>

        <PreviewRow
          label="Arbitrator"
          value={form.enableArbitrator ? truncateAddr(form.arbitrator) : 'None (no dispute resolution)'}
          mono={form.enableArbitrator}
          warn={!form.enableArbitrator}
        />
        <PreviewRow
          label="Refund Policy"
          value={REFUND_POLICY_LABELS[form.refundPolicy]}
        />
        <PreviewRow
          label="Auto-Release"
          value={form.autoReleaseOnDeadline ? '✅ Enabled — seller can claim after deadline' : '❌ Disabled — requires explicit approval'}
        />
        <PreviewRow
          label="Split Resolution"
          value={form.splitOnDispute ? '✅ Arbitrator can split funds' : '❌ All-or-nothing only'}
        />
      </div>

      {/* Milestones */}
      {form.enableMilestones && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="detail-section-title">Milestones ({form.milestones.length} escrow instances)</div>
          {form.milestones.map((ms, i) => (
            <div className="detail-row" key={i}>
              <span className="detail-row-label">{ms.label || `Milestone ${i + 1}`}</span>
              <span className="detail-row-value">
                {ms.pct}% · {formatXLM((totalAmount * ms.pct) / 100)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Description */}
      {form.desc && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="detail-section-title">Project Description</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.7 }}>{form.desc}</p>
        </div>
      )}

      {/* What happens on-chain */}
      <div className="card" style={{ marginBottom: 24, background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="detail-section-title" style={{ color: 'var(--accent)' }}>What gets deployed on Stellar</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.8 }}>
          {form.enableMilestones
            ? `→ ${form.milestones.length} separate Soroban escrow instances via the TrustWork factory`
            : '→ 1 Soroban escrow instance via the TrustWork factory'
          }<br />
          → Funds locked in smart contract until conditions are met<br />
          → State machine: AwaitingDeposit → Funded → WorkSubmitted → Completed<br />
          {form.enableArbitrator && '→ Arbitrator address stored on-chain for dispute resolution\n'}
          → All actions require cryptographic wallet signatures (Freighter)
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-full"
        onClick={onDeploy}
        disabled={loading}
      >
        {loading ? '⏳ Deploying to Stellar...' : '🚀 Deploy & Fund Escrow'}
      </button>
    </div>
  )
}

function PreviewRow({ label, value, mono, accent, warn }) {
  return (
    <div className="detail-row">
      <span className="detail-row-label">{label}</span>
      <span className={`detail-row-value ${mono ? 'mono' : ''}`} style={{
        color: accent ? 'var(--accent)' : warn ? 'var(--yellow)' : undefined,
        maxWidth: '60%', textAlign: 'right', wordBreak: 'break-all',
      }}>
        {value || '—'}
      </span>
    </div>
  )
}
