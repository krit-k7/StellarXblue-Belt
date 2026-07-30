import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ActionPanel from '../components/ActionPanel'
import ContractChat from '../components/ContractChat'
import { useChat } from '../hooks/useChat'
import {
  truncateAddr, formatXLM, formatDate, daysRemaining,
  CONTRACT_STATES,
  applySubmitWork, applyApprove, applyDispute, applyClaim, applyRefund,
} from '../utils/contract'
import {
  sorobanSubmitWork, sorobanApprove, sorobanRaiseDispute,
  sorobanClaimAfterDeadline, sorobanRefund, sorobanDeposit, 
  EXPLORER_BASE, NETWORK, syncContractFromChain,
} from '../utils/stellar'
import { PackageIcon, HistoryIcon, ShieldCheckIcon, ScaleIcon } from '../components/icons'

const STATUS_STEPS = [CONTRACT_STATES.ACTIVE, CONTRACT_STATES.SUBMITTED, CONTRACT_STATES.COMPLETED]

export default function ContractDetail({ contract, wallet, onUpdate, setPage, openTx, txSubmitting, txSuccess, txError, defaultTab }) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'overview')
  const { postSystemEvent } = useChat(contract?.id)

  useEffect(() => {
    if (contract?.escrowId && wallet) {
      syncContractFromChain(contract, wallet).then(synced => {
        if (synced.status !== contract.status) {
          onUpdate(synced)
        }
      }).catch(() => {})
    }
  }, [contract?.id, wallet])

  if (!contract) return null

  const days      = daysRemaining(contract.deadline)
  const isOverdue = days !== null && days < 0
  const stepIndex = STATUS_STEPS.indexOf(contract.status)
  const isClient     = contract.client === wallet
  const isFreelancer = contract.freelancer === wallet
  const _w = (wallet || '').trim().toUpperCase()
  const isClientSafe     = isClient     || _w === (contract.client     || '').trim().toUpperCase()
  const isFreelancerSafe = isFreelancer || _w === (contract.freelancer || '').trim().toUpperCase()

  const showDeliverables = contract.status === CONTRACT_STATES.SUBMITTED ||
    contract.status === CONTRACT_STATES.COMPLETED ||
    contract.status === CONTRACT_STATES.DISPUTED

  async function handleAction(action, payload) {
    const escrowId = contract.escrowId
    let updated = contract
    const isDemo = !escrowId
    const fakeTxHash = 'DEMO_' + Math.random().toString(36).slice(2, 18).toUpperCase()

    try {
      if (action === 'submit') {
        if (!isDemo) {
          openTx('Submit Work', `Marking work as submitted on Stellar ${NETWORK.toUpperCase()}`)
          const { txHash } = await sorobanSubmitWork(wallet, escrowId)
          txSuccess(txHash)
          updated = applySubmitWork(contract, txHash, payload.note, payload.deliverables, payload.uploadedFiles)
        } else {
          updated = applySubmitWork(contract, fakeTxHash, payload.note, payload.deliverables, payload.uploadedFiles)
        }
      } else if (action === 'approve') {
        if (!isDemo) {
          openTx('Approve & Release', `Releasing ${formatXLM(contract.amount)} to freelancer`)
          const { txHash } = await sorobanApprove(wallet, escrowId)
          txSuccess(txHash)
          updated = applyApprove(contract, txHash)
        } else {
          updated = applyApprove(contract, fakeTxHash)
        }
      } else if (action === 'dispute') {
        if (!isDemo) {
          openTx('Raise Dispute', 'Flagging contract for arbitration')
          const { txHash } = await sorobanRaiseDispute(wallet, escrowId)
          txSuccess(txHash)
          updated = applyDispute(contract, txHash, payload.reason)
        } else {
          updated = applyDispute(contract, fakeTxHash, payload.reason)
        }
      } else if (action === 'claim') {
        if (!isDemo) {
          openTx('Claim Payment', 'Claiming payment after review period expired')
          const { txHash } = await sorobanClaimAfterDeadline(wallet, escrowId)
          txSuccess(txHash)
          updated = applyClaim(contract, txHash)
        } else {
          updated = applyClaim(contract, fakeTxHash)
        }
      } else if (action === 'refund') {
        if (!isDemo) {
          openTx('Refund', 'Returning funds to client')
          const { txHash } = await sorobanRefund(wallet, escrowId)
          txSuccess(txHash)
          updated = applyRefund(contract, txHash)
        } else {
          updated = applyRefund(contract, fakeTxHash)
        }
      }
    } catch (err) {
      console.warn('Action failed:', err?.message)
      txError(err)
      return
    }

    onUpdate(updated)
    const chatEvents = {
      submit:  '📤 Freelancer submitted work. Client review period has started.',
      approve: '✅ Client approved the work. Payment released to freelancer.',
      dispute: `⚠️ Dispute raised: "${payload?.reason?.slice(0, 80)}"`,
      claim:   '💰 Freelancer claimed payment after review period expired.',
      refund:  '↩️ Client refunded. Funds returned.',
    }
    if (chatEvents[action]) postSystemEvent(chatEvents[action])
    if (action === 'submit') setActiveTab('chat')
  }

  const explorerBase = EXPLORER_BASE
  const clientExplorerUrl     = `${explorerBase}/account/${contract.client}`
  const freelancerExplorerUrl = `${explorerBase}/account/${contract.freelancer}`

  return (
    <motion.div 
      className="page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <motion.button 
            className="btn btn-outline btn-sm mb-16" 
            onClick={() => setPage('dashboard')}
            whileHover={{ x: -4 }}
            style={{ borderRadius: '8px' }}
          >
            ← Back to Dashboard
          </motion.button>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}>{contract.title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{contract.id}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(contract.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)' }}
            >
              Copy ID
            </button>
          </div>
        </div>
        <div className={`badge badge-${contract.status.toLowerCase()}`} style={{ fontSize: '0.9rem', padding: '8px 20px', borderRadius: '12px' }}>
          {contract.status}
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '40px' }}>
        {STATUS_STEPS.map((s, i) => (
          <div key={s} style={{ flex: 1, height: '4px', background: i <= stepIndex ? 'var(--accent)' : 'var(--border)', borderRadius: '2px', transition: 'all 0.5s' }} />
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: '32px', padding: '6px', borderRadius: '14px' }}>
        {['overview', 'chat', 'verify'].map(t => (
          <button 
            key={t} 
            className={`tab-btn ${activeTab === t ? 'active' : ''}`} 
            onClick={() => setActiveTab(t)}
            style={{ borderRadius: '10px', textTransform: 'capitalize' }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px' }}>
        <div className="detail-content">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="card" style={{ padding: '32px', marginBottom: '24px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    Escrow Amount
                  </div>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: '4px' }}>
                    {formatXLM(contract.amount)} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>XLM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <ShieldCheckIcon width={16} height={16} /> Secured by Soroban Smart Contract
                  </div>
                </div>

                <div className="card" style={{ padding: '32px' }}>
                  <h3 style={{ marginBottom: '24px' }}>Contract Parameters</h3>
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Client</span>
                      <a href={clientExplorerUrl} target="_blank" className="mono" style={{ color: 'var(--accent)' }}>{truncateAddr(contract.client)}</a>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Freelancer</span>
                      <a href={freelancerExplorerUrl} target="_blank" className="mono" style={{ color: 'var(--accent)' }}>{truncateAddr(contract.freelancer)}</a>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Deadline</span>
                      <span style={{ color: isOverdue ? 'var(--red)' : 'var(--text-heading)', fontWeight: 600 }}>
                        {formatDate(contract.deadline)} ({days}d remaining)
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div 
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ height: '600px' }}
              >
                <ContractChat contractId={contract.id} wallet={wallet} isFreelancer={isFreelancerSafe} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="detail-sidebar">
          <ActionPanel 
            contract={contract} 
            wallet={wallet} 
            onAction={handleAction} 
            isClient={isClientSafe} 
            isFreelancer={isFreelancerSafe} 
          />
        </div>
      </div>
    </motion.div>
  )
}
