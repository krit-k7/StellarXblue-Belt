import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CONTRACT_TEMPLATES, REFUND_POLICY_LABELS } from '../utils/contractTemplates'
import { truncateAddr, formatXLM, validateContractForm } from '../utils/contract'
import { TEMPLATE_ICONS } from './icons'

const STEPS = ['Template', 'Parties & Payment', 'Terms', 'Review & Deploy']

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

function Toggle({ value, onChange }) {
  return (
    <div 
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--accent)' : 'var(--border-strong)',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s'
      }}
    >
      <motion.div 
        animate={{ x: value ? 22 : 2 }}
        initial={false}
        style={{
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 2,
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  )
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
    const errors = validateContractForm(form, wallet)
    if (Object.keys(errors).length > 0) {
      setErrors(errors)
      return
    }
    onSubmit(form)
  }

  const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 40 }}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            {i < STEPS.length - 1 && (
              <div style={{
                position: 'absolute', top: 15, left: '50%', width: '100%', height: 2,
                background: i < step ? 'var(--accent)' : 'var(--border)',
                transition: 'background 0.3s'
              }} />
            )}
            <motion.div 
              animate={{ 
                background: i < step ? 'var(--accent)' : i === step ? 'var(--bg-elevated)' : 'var(--bg-elevated)',
                borderColor: i <= step ? 'var(--accent)' : 'var(--border)',
                scale: i === step ? 1.1 : 1
              }}
              style={{
                width: 32, height: 32, borderRadius: '50%', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.8rem', fontWeight: 800,
                border: '2px solid',
                color: i < step ? '#fff' : i === step ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              {i < step ? '✓' : i + 1}
            </motion.div>
            <div style={{
              fontSize: '0.7rem', marginTop: 8, fontWeight: 700,
              color: i <= step ? 'var(--text-heading)' : 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>{label}</div>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* STEP 0: Template picker */}
          {step === 0 && (
            <div className="template-grid">
              {CONTRACT_TEMPLATES.map(tpl => {
                const Icon = TEMPLATE_ICONS[tpl.icon]
                return (
                  <motion.div
                    key={tpl.id}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`template-card ${form.template === tpl.id ? 'active' : ''}`}
                    onClick={() => applyTemplate(tpl)}
                    style={{ padding: '24px', borderRadius: '20px' }}
                  >
                    <div className="template-icon-wrap" style={{ background: 'var(--grad-primary)', color: '#fff' }}>
                      <Icon width={24} height={24} />
                    </div>
                    <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '1rem', marginBottom: 8 }}>{tpl.label}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tpl.desc}</div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* STEP 1: Parties & Payment */}
          {step === 1 && (
            <div className="card" style={{ padding: '32px' }}>
              <div className="form-group">
                <label className="form-label">Project Title</label>
                <input className="form-input" placeholder="e.g. Professional UI Design" value={form.title} onChange={e => set('title', e.target.value)} />
                {errors.title && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.title}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Freelancer Stellar Address</label>
                <input className="form-input" placeholder="G..." value={form.freelancer} onChange={e => set('freelancer', e.target.value)} />
                {errors.freelancer && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.freelancer}</span>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Amount</label>
                  <input className="form-input" type="number" value={form.amount} onChange={e => set('amount', e.target.value)} />
                  {errors.amount && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.amount}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Token</label>
                  <select className="form-select" value={form.token} onChange={e => set('token', e.target.value)}>
                    <option value="XLM">XLM (Native)</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Terms */}
          {step === 2 && (
            <div className="card" style={{ padding: '32px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Project Deadline</label>
                  <input className="form-input" type="date" min={minDate} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
                  {errors.deadline && <span style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{errors.deadline}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Review Period</label>
                  <select className="form-select" value={form.reviewPeriod} onChange={e => set('reviewPeriod', e.target.value)}>
                    {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--overlay-1)', borderRadius: '12px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Auto-Release</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Payment released if no action after deadline</div>
                </div>
                <Toggle value={form.autoReleaseOnDeadline} onChange={v => set('autoReleaseOnDeadline', v)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--overlay-1)', borderRadius: '12px' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-heading)' }}>Enable Arbitrator</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Third-party resolution for disputes</div>
                </div>
                <Toggle value={form.enableArbitrator} onChange={v => set('enableArbitrator', v)} />
              </div>
            </div>
          )}

          {/* STEP 3: Review */}
          {step === 3 && (
            <div className="card" style={{ padding: '32px' }}>
              <h3 style={{ marginBottom: '24px' }}>Review Contract Details</h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Title</span>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{form.title}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Freelancer</span>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{truncateAddr(form.freelancer)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.25rem' }}>{form.amount} {form.token}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Deadline</span>
                  <span style={{ color: 'var(--text-heading)', fontWeight: 600 }}>{form.deadline}</span>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            {step > 0 ? (
              <button className="btn btn-outline" onClick={back} style={{ borderRadius: '12px' }}>Back</button>
            ) : <div />}
            
            {step < 3 ? (
              <motion.button 
                className="btn btn-primary" 
                onClick={next}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ borderRadius: '12px' }}
              >
                Continue
              </motion.button>
            ) : (
              <motion.button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ borderRadius: '12px', padding: '14px 40px' }}
              >
                {loading ? 'Deploying...' : 'Deploy Contract'}
              </motion.button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
