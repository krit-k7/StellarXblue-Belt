import { useState } from 'react'
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

      if (milestones.length === 0) {
        throw new Error('No valid milestones found.')
      }

      const results = []

      for (const ms of milestones) {
        let msAmount
        if (formData.enableMilestones) {
          const calculatedAmount = (Number(formData.amount) * ms.pct) / 100
          const roundedAmount = Math.round(calculatedAmount)
          msAmount = String(Math.max(1, roundedAmount))
        } else {
          msAmount = formData.amount
        }

        const msTitle = formData.enableMilestones
          ? `${formData.title} - ${ms.label}`
          : formData.title

        const amountNumber = Number(msAmount)
        if (!amountNumber || amountNumber <= 0) {
          throw new Error(`Invalid milestone amount: ${msAmount}`)
        }

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
      <div className="page-narrow">
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: 24 }}>🚀</div>
          <h2 style={{ marginBottom: 12 }}>
            {deployed.length > 1 ? `${deployed.length} Contracts Live` : 'Contract Deployed'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 40, fontSize: '1.1rem' }}>
            Successfully secured on Stellar {NETWORK.toUpperCase()}. <br/>Funds are now locked in the smart contract.
          </p>

          <div className="escrow-visual" style={{ marginBottom: 40 }}>
            <div className="escrow-amount" style={{ fontSize: '3.5rem' }}>{formatXLM(totalAmount)}</div>
            <div className="escrow-label">Total Amount Locked</div>
            <div className="escrow-locked">🔒 Verified Soroban Escrow</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
            {deployed.map((c) => (
              <div key={c.id} className="card" style={{ background: 'var(--bg-sunken)', padding: '20px', textAlign: 'left', border: '1px solid var(--border-strong)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '1rem' }}>{c.title}</div>
                  <span className="badge badge-active">ACTIVE</span>
                </div>
                <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>ID: <span className="mono" style={{ color: 'var(--text)' }}>{c.id}</span></span>
                  <span style={{ color: 'var(--accent)', fontWeight: '800' }}>{formatXLM(c.amount)}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => setPage('dashboard')}>Go to Dashboard</button>
            <button className="btn btn-secondary btn-lg" onClick={() => setDeployed(null)}>Create New</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-narrow">
      <div className="mb-48">
        <button className="btn btn-secondary btn-sm mb-24" onClick={() => setPage('dashboard')}>← Back</button>
        <h2 className="page-title">Contract Builder</h2>
        <p className="page-subtitle">Deploy a secure Soroban escrow contract in minutes.</p>
      </div>

      {!wallet && (
        <div className="card" style={{ 
          background: 'var(--accent-glow)', border: '1px solid var(--accent)', 
          padding: '24px', textAlign: 'center', marginBottom: 32, cursor: 'pointer' 
        }} onClick={onConnect}>
          <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '1.1rem' }}>
            Wallet Connection Required
          </div>
          <p style={{ color: 'var(--text)', marginTop: 8 }}>Click here to connect your Stellar wallet and start building.</p>
        </div>
      )}

      {wallet && (
        <div className="card mb-32" style={{ border: '1px solid var(--border-strong)' }}>
          <div className="flex-between mb-16">
            <h3 style={{ fontSize: '1.1rem' }}>🧪 System Readiness</h3>
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={testContract}
              disabled={contractTest?.testing}
            >
              {contractTest?.testing ? 'Testing...' : 'Run Diagnostics'}
            </button>
          </div>
          
          {contractTest && !contractTest.testing && (
            <div className={`alert ${contractTest.deployed ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 0, borderRadius: 'var(--radius)' }}>
              {contractTest.deployed ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 800 }}>Network Ready</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Soroban factory is reachable on {NETWORK}.</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.5rem' }}>❌</span>
                  <div>
                    <div style={{ fontWeight: 800 }}>Deployment Issue</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{contractTest.error}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <ContractForm onSubmit={handleCreate} loading={loading} wallet={wallet} />
      </div>
    </div>
  )
}
