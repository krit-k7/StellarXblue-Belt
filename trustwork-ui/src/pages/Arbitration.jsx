import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { truncateAddr, formatXLM, formatDate, CONTRACT_STATES, applyResolve } from '../utils/contract'
import { sorobanResolveDispute } from '../utils/stellar'
import { ScaleIcon, ClipboardIcon } from '../components/icons'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function Arbitration({ contracts, onUpdate, wallet, openTx, txSubmitting, txSuccess, txError }) {
  const disputed = contracts.filter(c => c.status === CONTRACT_STATES.DISPUTED)
  const resolved = contracts.filter(c =>
    c.resolution && (c.status === CONTRACT_STATES.COMPLETED || c.status === CONTRACT_STATES.REFUNDED)
  )

  const [loading, setLoading] = useState(null)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('pending')

  async function handleResolve(contract, resolution) {
    setLoading(contract.id + resolution)
    try {
      openTx('Resolve Dispute', `Resolving dispute for ${contract.title}`)
      const { txHash } = await sorobanResolveDispute(wallet, contract.escrowId, resolution)
      txSuccess(txHash)
      onUpdate(applyResolve(contract, txHash, resolution))
    } catch (err) {
      txError(err)
    } finally {
      setLoading(null)
      setSelected(null)
    }
  }

  return (
    <motion.div 
      className="page"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.div className="mb-32" variants={item}>
        <h2 className="page-title" style={{ fontSize: '2.5rem', fontWeight: 800 }}>Arbitration Center</h2>
        <p className="page-subtitle">Fair resolution for disputed Stellar escrow contracts</p>
      </motion.div>

      <motion.div className="tabs mb-32" variants={item} style={{ padding: '6px', borderRadius: '14px' }}>
        <button 
          className={`tab-btn ${tab === 'pending' ? 'active' : ''}`} 
          onClick={() => setTab('pending')}
          style={{ borderRadius: '10px', padding: '10px 24px' }}
        >
          Pending Cases {disputed.length > 0 && <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '2px 8px', fontSize: '0.7rem' }}>{disputed.length}</span>}
        </button>
        <button 
          className={`tab-btn ${tab === 'resolved' ? 'active' : ''}`} 
          onClick={() => setTab('resolved')}
          style={{ borderRadius: '10px', padding: '10px 24px' }}
        >
          Resolution History
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === 'pending' && (
          <motion.div 
            key="pending"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="arb-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}
          >
            {disputed.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon" style={{ background: 'var(--overlay-1)', border: '1px solid var(--border-strong)', color: 'var(--accent)' }}>
                  <ScaleIcon width={32} height={32} />
                </div>
                <div className="empty-title">System Healthy</div>
                <p className="empty-desc">No active disputes require arbitration at this time.</p>
              </div>
            ) : (
              disputed.map(c => (
                <motion.div className="card" key={c.id} whileHover={{ y: -4 }}>
                  <div className="flex-between mb-24">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-heading)' }}>{c.title}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.id}</div>
                    </div>
                    <span className="badge badge-disputed">DISPUTED</span>
                  </div>

                  <div style={{ background: 'var(--overlay-1)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Case Summary</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem' }}>Amount</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatXLM(c.amount)} XLM</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.85rem' }}>Reason</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-heading)', textAlign: 'right', maxWidth: '60%' }}>{c.disputeReason}</span>
                    </div>
                  </div>

                  <motion.button 
                    className="btn btn-primary btn-full" 
                    onClick={() => setSelected(c)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ borderRadius: '12px' }}
                  >
                    ⚖️ Resolve Case
                  </motion.button>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selected && (
          <div className="modal-overlay" onClick={() => setSelected(null)}>
            <motion.div 
              className="modal" 
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <h3 style={{ marginBottom: '16px' }}>Resolution for {selected.title}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Choose the final allocation of the escrow funds.</p>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <button className="btn btn-primary btn-full" onClick={() => handleResolve(selected, 'freelancer')} style={{ background: 'var(--green)', color: '#fff' }}>
                  Release to Freelancer (100%)
                </button>
                <button className="btn btn-primary btn-full" onClick={() => handleResolve(selected, 'client')} style={{ background: 'var(--red)', color: '#fff' }}>
                  Refund to Client (100%)
                </button>
                <button className="btn btn-outline btn-full" onClick={() => handleResolve(selected, 'split')}>
                  Split 50/50
                </button>
                <button className="btn btn-secondary btn-full" onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
