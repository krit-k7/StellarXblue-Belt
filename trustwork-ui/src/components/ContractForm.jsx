import { useState } from 'react'
import { CONTRACT_TEMPLATES, REFUND_POLICY_LABELS, reviewPeriodLabel } from '../utils/contractTemplates'
import { truncateAddr, formatXLM, validateContractForm } from '../utils/contract'
import { TEMPLATE_ICONS } from './icons'

const STEPS = ['Template', 'Parties', 'Terms', 'Review']

const INITIAL_FORM = {
  template: null,
  title: '',
  freelancer: '',
  amount: '',
  token: 'XLM',
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

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: '' }))
  }

  function applyTemplate(tpl) {
    setForm(f => ({ ...f, template: tpl.id, ...tpl.defaults }))
    setStep(1)
  }

  function validateStep(s) {
    const e = {}
    if (s === 1) {
      if (!form.title?.trim()) e.title = 'Project title is required'
      if (!form.freelancer?.trim()) e.freelancer = 'Freelancer address is required'
      if (!form.amount || isNaN(Number(form.amount))) e.amount = 'Valid amount is required'
    }
    if (s === 2) {
      if (!form.deadline) e.deadline = 'Deadline is required'
      if (form.enableArbitrator && !form.arbitrator) e.arbitrator = 'Arbitrator address required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validateStep(step)) setStep(s => s + 1) }
  const back = () => setStep(s => s - 1)

  const handleSubmit = () => {
    if (validateStep(2)) onSubmit(form)
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 48, position: 'relative', padding: '0 10px' }}>
        <div style={{ position: 'absolute', top: '12px', left: '20px', right: '20px', height: '2px', background: 'var(--border-strong)', zIndex: 0 }} />
        {STEPS.map((label, i) => (
          <div key={label} style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <div style={{ 
              width: 26, height: 26, borderRadius: '50%', margin: '0 auto 8px',
              background: step >= i ? 'var(--grad-primary)' : 'var(--bg-sunken)',
              border: `2px solid ${step >= i ? 'transparent' : 'var(--border-strong)'}`,
              color: step >= i ? 'var(--accent-ink)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justify_content: 'center', fontSize: '0.75rem', fontWeight: '800'
            }}>
              {step > i ? '✓' : i + 1}
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: '800', color: step === i ? 'var(--text-heading)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* STEP 0: Template Selection */}
      {step === 0 && (
        <div className="template-grid">
          {CONTRACT_TEMPLATES.map(tpl => {
            const Icon = TEMPLATE_ICONS[tpl.icon] || TEMPLATE_ICONS.bolt
            return (
              <div 
                key={tpl.id} 
                className={`card template-card ${form.template === tpl.id ? 'active' : ''}`}
                onClick={() => applyTemplate(tpl)}
              >
                <div className="template-icon-wrap">
                  <Icon width={24} height={24} />
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>{tpl.label}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tpl.desc}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* STEP 1: Parties & Payment */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="form-group">
            <label className="form-label">Project Title</label>
            <input className="form-input" placeholder="e.g. Website Redesign" value={form.title} onChange={e => set('title', e.target.value)} />
            {errors.title && <span style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.title}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Freelancer Wallet Address</label>
            <input className="form-input mono" placeholder="G..." value={form.freelancer} onChange={e => set('freelancer', e.target.value)} />
            {errors.freelancer && <span style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.freelancer}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Escrow Amount (XLM)</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type="number" placeholder="0.00" value={form.amount} onChange={e => set('amount', e.target.value)} style={{ paddingRight: '80px', fontSize: '1.25rem', fontWeight: '700' }} />
              <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--accent)' }}>XLM</div>
            </div>
            {errors.amount && <span style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.amount}</span>}
          </div>
        </div>
      )}

      {/* STEP 2: Terms & Conditions */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input className="form-input" type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} />
            {errors.deadline && <span style={{ color: 'var(--red)', fontSize: '0.8rem', marginTop: 4, display: 'block' }}>{errors.deadline}</span>}
          </div>
          
          <div className="card" style={{ padding: '20px', background: 'var(--bg-sunken)' }}>
            <div className="flex-between mb-16">
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Enable Arbitrator</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>A trusted third party to resolve disputes.</div>
              </div>
              <Toggle value={form.enableArbitrator} onChange={v => set('enableArbitrator', v)} />
            </div>
            {form.enableArbitrator && (
              <input className="form-input mono" placeholder="Arbitrator Address (G...)" value={form.arbitrator} onChange={e => set('arbitrator', e.target.value)} />
            )}
          </div>

          <div className="card" style={{ padding: '20px', background: 'var(--bg-sunken)' }}>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Auto-Release</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Release funds automatically if client is inactive.</div>
              </div>
              <Toggle value={form.autoReleaseOnDeadline} onChange={v => set('autoReleaseOnDeadline', v)} />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="escrow-visual">
            <div className="escrow-amount">{formatXLM(form.amount)}</div>
            <div className="escrow-label">Will be locked in Soroban</div>
          </div>
          <div className="card" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-strong)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 20 }}>Contract Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow label="Freelancer" value={truncateAddr(form.freelancer)} mono />
              <ReviewRow label="Deadline" value={form.deadline} />
              <ReviewRow label="Arbitration" value={form.enableArbitrator ? 'Enabled' : 'Disabled'} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Deploying...' : '🚀 Deploy & Fund Escrow'}
          </button>
        </div>
      )}

      {/* Navigation */}
      {step > 0 && step < 3 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
          <button className="btn btn-secondary" onClick={back}>Back</button>
          <button className="btn btn-primary" onClick={next}>Continue</button>
        </div>
      )}
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <div 
      onClick={() => onChange(!value)}
      style={{
        width: 52, height: 28, borderRadius: 14, cursor: 'pointer',
        background: value ? 'var(--accent)' : 'var(--border-strong)',
        position: 'relative', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: value ? '0 4px 12px var(--accent-glow)' : 'none'
      }}
    >
      <div style={{
        position: 'absolute', top: 4, left: value ? 28 : 4,
        width: 20, height: 20, borderRadius: '50%',
        background: value ? 'var(--accent-ink)' : '#fff', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }} />
    </div>
  )
}

function ReviewRow({ label, value, mono }) {
  return (
    <div className="flex-between" style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>{label}</span>
      <span style={{ color: 'var(--text-heading)', fontWeight: '700', fontSize: '0.9rem', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value}</span>
    </div>
  )
}
