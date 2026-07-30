import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContractForm from '../components/ContractForm'
import {
  sorobanCreateEscrow, sorobanDeposit,
  getXlmSac, NETWORK, EXPLORER_BASE, testContractDeployment,
} from '../utils/stellar'
import {
  formatXLM, formatContractId, CONTRACT_STATES,
} from '../utils/contract'

export default function CreateContract({ onCreate, wallet, setPage, onConnect, openTx, txSubmitting, txSuccess, txError }) {
  const [loading, setLoading] = useState(false)
  const [deployed, setDeployed] = useState(null)
  const [contractTest, setContractTest] = useState(null)

  async function testContract() {
    if (!wallet) { onConnect(); return }
    setContractTest({ testing: true })
    try {
      const result = await testContractDeployment(wallet)
      setContractTest(result)
    } catch (error) {
      setContractTest({ deployed: false, error: error.message, working: false })
    }
  }

  async function handleCreate(formData) {
    if (!wallet) { onConnect(); return }
    setLoading(true)

    try {
      const deadlineUnix = Math.floor(new Date(formData.deadline).getTime() / 1000)
      const tokenAddress = formData.token === 'XLM' || formData.token === 'custom'
        ? (formData.customToken || getXlmSac())
        : getXlmSac()

      const milestones = formData.enableMilestones && formData.milestones?.length > 1
        ? formData.milestones.filter(m => m.pct > 0)
        : [{ label: formData.title, pct: 100 }]

      const results = []

      for (const ms of milestones) {
        let msAmount = formData.enableMilestones ? String(Math.max(1, Math.round((Number(formData.amount) * ms.pct) / 100))) : formData.amount
        const msTitle = formData.enableMilestones ? `${formData.title} - ${ms.label}` : formData.title

        openTx('Create Escrow', `Deploying "${msTitle}" on Stellar ${NETWORK.toUpperCase()}`)
        const { result: escrowId, txHash: createTxHash } = await sorobanCreateEscrow(wallet, {
          buyer:        wallet,
          seller:       formData.freelancer,
          arbitrator:   formData.enableArbitrator ? formData.arbitrator : null,
          amountXlm:    msAmount,
          tokenAddress,
          deadlineUnix,
          description:  msTitle,
        })

        txSubmitting()
        openTx('Approve & Fund Escrow', `Step 1: Approve token spend · Step 2: Lock ${msAmount} XLM`)

        let depositTxHash
        try {
          const depositResult = await sorobanDeposit(wallet, escrowId)
          depositTxHash = depositResult.txHash
          txSuccess(depositTxHash)
        } catch (depositError) {
          txError(depositError)
          depositTxHash = null
        }

        const contract = {
          id:           formatContractId(escrowId),
          escrowId:     Number(escrowId),
          title:        msTitle,
          client:       wallet,
          freelancer:   formData.freelancer,
          arbitrator:   formData.enableArbitrator ? formData.arbitrator : null,
          amount:       msAmount,
          token:        formData.token || 'XLM',
          tokenAddress,
          desc:         formData.desc,
          deadline:     formData.deadline,
          reviewPeriod: formData.reviewPeriod,
          refundPolicy: formData.refundPolicy,
          autoReleaseOnDeadline: formData.autoReleaseOnDeadline,
          splitOnDispute: formData.splitOnDispute,
          enableMilestones: formData.enableMilestones,
          milestoneLabel: ms.label,
          milestonePct:   ms.pct,
          isMilestone:    formData.enableMilestones,
          status:         depositTxHash ? CONTRACT_STATES.ACTIVE : CONTRACT_STATES.AWAITING_DEPOSIT,
          createdAt:      new Date().toISOString(),
          fundedAt:       depositTxHash ? new Date().toISOString() : null,
          createTxHash,
          depositTxHash,
          network:        NETWORK,
          fundingError:   depositTxHash ? null : 'Deposit failed - contract created but not funded',
        }

        results.push(contract)
        onCreate(contract)
      }

      setDeployed(results)
    } catch (err) {
      txError(err)
    } finally {
      setLoading(false)
    }
  }

  if (deployed) {
    const totalAmount = deployed.reduce((s, c) => s + Number(c.amount), 0)

    return (
      <motion.div 
        className="page-narrow"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>🚀</div>
          <h2 style={{ fontSize: '2.5rem', marginBottom: 12 }}>Contract Deployed</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '1.1rem' }}>
            Escrow is live on Stellar. Funds are securely locked in the smart contract.
          </p>

          <div className="escrow-visual" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '40px', borderRadius: '24px', marginBottom: 32 }}>
            <div className="escrow-amount" style={{ fontSize: '4rem', color: 'var(--text-heading)' }}>{formatXLM(totalAmount)} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>XLM</span></div>
            <div style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 12 }}>🔒 Soroban Escrow Secured</div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <motion.button 
              className="btn btn-primary" 
              onClick={() => setPage('dashboard')}
              whileHover={{ scale: 1.05 }}
              style={{ borderRadius: '12px', padding: '14px 32px' }}
            >
              Go to Dashboard
            </motion.button>
            <button className="btn btn-outline" onClick={() => setDeployed(null)} style={{ borderRadius: '12px' }}>
              Create Another
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="page-narrow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-40">
        <motion.button 
          className="btn btn-outline btn-sm mb-16" 
          onClick={() => setPage('dashboard')}
          whileHover={{ x: -4 }}
          style={{ borderRadius: '8px' }}
        >
          ← Back
        </motion.button>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 8 }}>Contract Builder</h2>
        <p className="page-subtitle">Configure and deploy a professional escrow agreement on Stellar.</p>
      </div>

      {!wallet && (
        <motion.div 
          className="alert alert-warning mb-32" 
          onClick={onConnect}
          whileHover={{ scale: 1.01 }}
          style={{ cursor: 'pointer', padding: '20px', borderRadius: '16px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)' }}
        >
          ⚡ <strong>Wallet Connection Required</strong>
          <div style={{ fontSize: '0.9rem', marginTop: 4 }}>Connect your Stellar wallet to authorize smart contract deployment.</div>
        </motion.div>
      )}

      <div className="card" style={{ padding: '40px', borderRadius: '24px' }}>
        <ContractForm onSubmit={handleCreate} loading={loading} wallet={wallet} />
      </div>
    </motion.div>
  )
}
