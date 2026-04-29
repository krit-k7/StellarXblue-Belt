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
    
    console.log('🧪 Starting contract deployment test...')
    setContractTest({ testing: true })
    
    try {
      const result = await testContractDeployment(wallet)
      setContractTest(result)
      console.log('🧪 Contract test result:', result)
    } catch (error) {
      console.error('🧪 Contract test error:', error)
      setContractTest({ deployed: false, error: error.message, working: false })
    }
  }

  async function handleCreate(formData) {
    if (!wallet) { onConnect(); return }
    setLoading(true)

    try {
      console.log('🚀 Contract creation v6.0 - FIXED: Unicode character sanitization for Symbol type')
      console.log('Starting contract creation with data:', formData)
      
      const deadlineUnix = Math.floor(new Date(formData.deadline).getTime() / 1000)
      console.log('Deadline Unix:', deadlineUnix)
      
      const tokenAddress = formData.token === 'XLM' || formData.token === 'custom'
        ? (formData.customToken || getXlmSac())
        : getXlmSac()
      console.log('Token address:', tokenAddress)

      // Handle milestone mode — create N escrow instances
      const milestones = formData.enableMilestones && formData.milestones?.length > 1
        ? formData.milestones.filter(m => m.pct > 0) // Filter out 0% milestones
        : [{ label: formData.title, pct: 100 }]
      console.log('Milestones:', milestones)

      if (milestones.length === 0) {
        throw new Error('No valid milestones found. All milestones have 0% allocation.')
      }

      const results = []

      for (const ms of milestones) {
        // Calculate milestone amount with proper validation
        let msAmount
        if (formData.enableMilestones) {
          const calculatedAmount = (Number(formData.amount) * ms.pct) / 100
          const roundedAmount = Math.round(calculatedAmount)
          msAmount = String(Math.max(1, roundedAmount)) // Ensure at least 1 stroop
        } else {
          msAmount = formData.amount
        }

        const msTitle = formData.enableMilestones
          ? `${formData.title} - ${ms.label}`  // Use regular hyphen instead of em-dash
          : formData.title

        console.log('Creating escrow:', { 
          msTitle, 
          msAmount, 
          msAmountNumber: Number(msAmount),
          originalAmount: formData.amount,
          percentage: ms.pct,
          calculation: (Number(formData.amount) * ms.pct) / 100,
          rounded: Math.round((Number(formData.amount) * ms.pct) / 100)
        })

        // Final validation
        const amountNumber = Number(msAmount)
        if (!amountNumber || amountNumber <= 0) {
          throw new Error(`Invalid milestone amount: ${msAmount}. Original: ${formData.amount}, Percentage: ${ms.pct}%`)
        }

        // Step 1: create_escrow — opens Freighter for signing
        openTx('Create Escrow', `Deploying "${msTitle}" on Stellar ${NETWORK.toUpperCase()}`)

        const { result: escrowId, txHash: createTxHash } = await sorobanCreateEscrow(wallet, {
          buyer:        wallet,
          seller:       formData.freelancer,
          arbitrator:   formData.enableArbitrator ? formData.arbitrator : null,
          amountXlm:    msAmount,
          tokenAddress,
          deadlineUnix,
          description:  msTitle, // sanitizeForSymbol() inside sorobanCreateEscrow handles all cleanup
        })

        console.log('Escrow created:', { escrowId, createTxHash })
        txSubmitting()

        // Step 2: approve + deposit — Freighter will pop up twice
        openTx('Approve & Fund Escrow', `Step 1: Approve token spend · Step 2: Lock ${msAmount} XLM`)

        let depositTxHash
        try {
          const depositResult = await sorobanDeposit(wallet, escrowId)
          depositTxHash = depositResult.txHash
          console.log('Deposit complete:', { depositTxHash })
          txSuccess(depositTxHash)
        } catch (depositError) {
          console.error('❌ Deposit failed:', depositError)
          
          // For milestone contracts, we'll create the UI contract but mark it as unfunded
          // This allows the user to manually fund it later or see what went wrong
          console.warn('⚠️ Creating contract in UI without funding due to deposit error')
          txError(depositError)
          
          // Continue with contract creation but mark as unfunded
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
      console.error('Contract creation error:', err)
      console.error('Error details:', {
        message: err?.message,
        originalError: err?.originalError,
        stack: err?.stack
      })
      txError(err)
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (deployed) {
    const totalAmount = deployed.reduce((s, c) => s + Number(c.amount), 0)

    return (
      <div className="page-narrow">
        <div className="card" style={{ textAlign: 'center', padding: '40px 32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
          <h2 style={{ marginBottom: 8 }}>
            {deployed.length > 1 ? `${deployed.length} Contracts Deployed` : 'Contract Deployed'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
            Live on Stellar {NETWORK.toUpperCase()}. Funds are locked in the Soroban smart contract.
          </p>

          <div className="escrow-visual" style={{ marginBottom: 20 }}>
            <div className="escrow-amount">{formatXLM(totalAmount)}</div>
            <div className="escrow-label">Locked in Soroban Escrow</div>
            <div className="escrow-locked">🔒 {NETWORK.toUpperCase()} · Publicly Verifiable</div>
          </div>

          {deployed.map((c) => (
            <div key={c.id} className="card" style={{ marginBottom: 10, padding: 16, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{c.title}</div>
                <span className="badge badge-active">ACTIVE</span>
              </div>
              <div className="detail-row" style={{ paddingTop: 0 }}>
                <span className="detail-row-label">Contract ID</span>
                <span className="detail-row-value mono">{c.id}</span>
              </div>
              <div className="detail-row">
                <span className="detail-row-label">Amount Locked</span>
                <span className="detail-row-value" style={{ color: 'var(--accent)' }}>{formatXLM(c.amount)}</span>
              </div>
              {c.depositTxHash && (
                <div className="detail-row">
                  <span className="detail-row-label">Tx Hash</span>
                  <a
                    href={`${EXPLORER_BASE}/tx/${c.depositTxHash}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'monospace' }}
                  >
                    {c.depositTxHash.slice(0, 16)}... ↗
                  </a>
                </div>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => setPage('dashboard')}>Go to Dashboard</button>
            <button className="btn btn-secondary" onClick={() => setDeployed(null)}>Create Another</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-narrow">
      <div className="mb-32">
        <button className="btn btn-secondary btn-sm mb-16" onClick={() => setPage('dashboard')}>← Back</button>
        <h2 className="page-title">Contract Builder</h2>
        <p className="page-subtitle">Deploy a Soroban escrow contract on Stellar {NETWORK.toUpperCase()}</p>
      </div>

      {!wallet && (
        <div className="alert alert-warning mb-24" style={{ cursor: 'pointer' }} onClick={onConnect}>
          ⚠️ Connect your wallet to deploy. <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Click to connect →</span>
        </div>
      )}

      {/* Contract Test Section */}
      {wallet && (
        <div className="card mb-24">
          <div className="detail-section-title">🧪 Contract Status</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Test if the smart contract is properly deployed and accessible before creating contracts.
          </p>
          
          <button 
            className="btn btn-secondary mb-16" 
            onClick={testContract}
            disabled={contractTest?.testing}
          >
            {contractTest?.testing ? '🧪 Testing...' : '🧪 Test Contract'}
          </button>

          {contractTest && !contractTest.testing && (
            <div className={`alert ${contractTest.deployed ? 'alert-success' : 'alert-danger'}`} style={{ marginBottom: 0 }}>
              {contractTest.deployed ? (
                <>
                  ✅ <strong>Contract is working perfectly!</strong>
                  <br />
                  <small>
                    RPC: ✅ Connected | 
                    Escrow count: {contractTest.count} | 
                    Latest ledger: {contractTest.latestLedger}
                  </small>
                  <br />
                  <small style={{ color: 'var(--green)', fontWeight: 600 }}>
                    Ready to create contracts! 🚀
                  </small>
                </>
              ) : (
                <>
                  ❌ <strong>Contract deployment issue detected</strong>
                  <br />
                  <small>
                    RPC: {contractTest.rpcWorking ? '✅ Connected' : '❌ Failed'} | 
                    Error: {contractTest.error}
                  </small>
                  <br />
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                    <strong>🔧 How to fix:</strong>
                    <br />
                    1. Check if contract ID in <code>.env</code> is correct
                    <br />
                    2. Redeploy contract: <code>./deploy-contract.sh</code>
                    <br />
                    3. Restart dev server and hard refresh browser
                    <br />
                    4. See <code>REDEPLOY_CONTRACT.md</code> for detailed guide
                  </div>
                </>
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
