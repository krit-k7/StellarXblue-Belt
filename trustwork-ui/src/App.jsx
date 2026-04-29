import { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import WalletModal from './components/WalletModal'
import TxModal from './components/TxModal'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import CreateContract from './pages/CreateContract'
import ContractDetail from './pages/ContractDetail'
import Arbitration from './pages/Arbitration'
import { useWallet } from './hooks/useWallet'
import { loadContracts, addContract, updateContract } from './utils/contract'
import { NETWORK, sorobanGetEscrow, stroopsToXlm } from './utils/stellar'

function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.icon} {t.message}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [page, setPage]           = useState('home')
  const [contracts, setContracts] = useState([])
  const [selected, setSelected]   = useState(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [tx, setTx]               = useState(null)
  const [toasts, setToasts]       = useState([])
  // chatContractId: set when opening via invite link
  const [chatContractId, setChatContractId] = useState(null)

  const walletState = useWallet()
  const { address: wallet, disconnect } = walletState

  // ── One-time cleanup: remove any seeded demo contracts from localStorage ──
  useEffect(() => {
    const DEMO_IDS = ['TW-A1B2C3', 'TW-D4E5F6', 'TW-G7H8I9', 'TW-J1K2L3']
    // Scan all tw_contracts_* keys and strip demo entries
    Object.keys(localStorage).forEach(key => {
      if (!key.startsWith('tw_contracts_')) return
      try {
        const contracts = JSON.parse(localStorage.getItem(key) || '[]')
        const cleaned = contracts.filter(c => !DEMO_IDS.includes(c.id))
        if (cleaned.length !== contracts.length) {
          localStorage.setItem(key, JSON.stringify(cleaned))
        }
      } catch { /* ignore */ }
    })
  }, [])

  // ── Parse invite link on load: #chat/TW-XXXXXX ────────────────────────────
  useEffect(() => {
    function handleHash() {
      const hash = window.location.hash
      const match = hash.match(/^#chat\/(.+)$/)
      if (match) {
        setChatContractId(match[1])
        setPage('chat-invite')
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  // ── Load contracts from localStorage when wallet connects ──────────────────
  useEffect(() => {
    if (wallet) {
      const stored = loadContracts(wallet)
      setContracts(stored)

      addToast('Wallet connected', 'success', '🔗')
      setWalletOpen(false)

      // If arrived via invite link, find the contract and open its chat
      if (chatContractId) {
        const found = stored.find(c => c.id === chatContractId)
        if (found) {
          setSelected(found)
          setPage('detail')
          window.history.replaceState(null, '', window.location.pathname)
        }
        // If not found locally, stay on chat-invite — it will fetch from chain
      }
    } else {
      setContracts([])
    }
  }, [wallet, chatContractId])

  // ── Toast helpers ──────────────────────────────────────────────────────────
  function addToast(message, type = 'info', icon = '⚡') {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type, icon }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  // ── TxModal helpers ────────────────────────────────────────────────────────
  // Call this before invoking a contract function to show the signing modal
  function openTx(title, description) {
    setTx({ status: 'signing', title, description, network: NETWORK })
  }
  function txSubmitting() {
    setTx(prev => ({ ...prev, status: 'submitting' }))
  }
  function txSuccess(txHash) {
    setTx(prev => ({ ...prev, status: 'success', txHash }))
  }
  function txError(error) {
    setTx(prev => ({ ...prev, status: 'error', error: error?.message || String(error) }))
  }
  function closeTx() { setTx(null) }

  // ── Contract handlers ──────────────────────────────────────────────────────
  function handleCreate(contract) {
    addContract(wallet, contract)
    setContracts(prev => [contract, ...prev.filter(c => c.id !== contract.id)])
    addToast(`Contract ${contract.id} deployed on Stellar ${NETWORK}`, 'success', '🔒')
    // Seed chat
    try {
      const key = `tw_chat_${contract.id}`
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([{
          id: Date.now(),
          contractId: contract.id,
          sender: 'TrustWork',
          senderRole: 'system',
          text: `🚀 Contract deployed on Stellar ${NETWORK.toUpperCase()}! Escrow of ${contract.amount} ${contract.token || 'XLM'} is locked. Share the Chat tab link with your freelancer.`,
          attachments: [],
          type: 'system',
          ts: new Date().toISOString(),
        }]))
      }
    } catch { /* ignore */ }
  }

  function handleView(contract) {
    setSelected(contract)
    setPage('detail')
  }

  function handleUpdate(updated) {
    updateContract(wallet, updated)
    setContracts(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
    const msgs = {
      ACTIVE:     ['Funds deposited — escrow is live', 'success', '💰'],
      SUBMITTED:  ['Work submitted successfully', 'info', '📤'],
      COMPLETED:  ['Payment released to freelancer', 'success', '✅'],
      DISPUTED:   ['Dispute raised — arbitration pending', 'error', '⚠️'],
      REFUNDED:   ['Funds refunded to client', 'info', '↩️'],
    }
    const m = msgs[updated.status]
    if (m) addToast(...m)
  }

  function handleDisconnect() {
    disconnect()
    setContracts([])
    setSelected(null)
    addToast('Wallet disconnected', 'info', '🔌')
  }

  // Keep selected in sync
  useEffect(() => {
    if (selected) {
      const fresh = contracts.find(c => c.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [contracts, selected])

  return (
    <>
      <Navbar
        page={page}
        setPage={setPage}
        wallet={wallet}
        onOpenWallet={() => setWalletOpen(true)}
        onDisconnect={handleDisconnect}
      />

      {page === 'home' && (
        <Home onConnect={() => setWalletOpen(true)} wallet={wallet} setPage={setPage} />
      )}
      {page === 'dashboard' && (
        <Dashboard
          contracts={contracts}
          onView={handleView}
          setPage={setPage}
          wallet={wallet}
        />
      )}
      {page === 'create' && (
        <CreateContract
          onCreate={handleCreate}
          wallet={wallet}
          setPage={setPage}
          onConnect={() => setWalletOpen(true)}
          openTx={openTx}
          txSubmitting={txSubmitting}
          txSuccess={txSuccess}
          txError={txError}
        />
      )}
      {page === 'detail' && selected && (
        <ContractDetail
          contract={selected}
          wallet={wallet}
          onUpdate={handleUpdate}
          setPage={setPage}
          openTx={openTx}
          txSubmitting={txSubmitting}
          txSuccess={txSuccess}
          txError={txError}
          defaultTab="chat"
        />
      )}

      {/* ── Chat invite landing page ─────────────────────────────────────── */}
      {page === 'chat-invite' && (
        <ChatInviteLanding
          contractId={chatContractId}
          wallet={wallet}
          contracts={contracts}
          onConnect={() => setWalletOpen(true)}
          onAddContract={(contract) => {
            addContract(wallet, contract)
            setContracts(prev => [contract, ...prev.filter(c => c.id !== contract.id)])
          }}
          onOpen={(contract) => {
            setSelected(contract)
            setPage('detail')
            window.history.replaceState(null, '', window.location.pathname)
          }}
        />
      )}
      {page === 'arbitration' && (
        <Arbitration
          contracts={contracts}
          onUpdate={handleUpdate}
          wallet={wallet}
          openTx={openTx}
          txSubmitting={txSubmitting}
          txSuccess={txSuccess}
          txError={txError}
        />
      )}
      {walletOpen && (
        <WalletModal walletState={walletState} onClose={() => setWalletOpen(false)} />
      )}

      {tx && <TxModal tx={tx} onClose={closeTx} />}

      <Toast toasts={toasts} />
    </>
  )
}

// ── Chat Invite Landing ───────────────────────────────────────────────────────
// Shown when freelancer opens an invite link.
// Fetches contract data from Soroban if not in local storage.
function ChatInviteLanding({ contractId, wallet, contracts, onConnect, onOpen, onAddContract }) {
  const [fetching, setFetching]     = useState(false)
  const [fetchedContract, setFetchedContract] = useState(null)
  const [fetchError, setFetchError] = useState(null)

  // Extract numeric escrow ID from "TW-000001" → 1
  const escrowId = parseInt(contractId?.replace('TW-', ''), 10)

  // First check local storage
  const localContract = contracts.find(c => c.id === contractId)
  const contract = localContract || fetchedContract

  // Fetch from chain if not in local storage and wallet is connected
  useEffect(() => {
    if (!wallet || localContract || isNaN(escrowId)) return
    setFetching(true)
    setFetchError(null)

    sorobanGetEscrow(escrowId, wallet).then(data => {
      if (!data) { setFetchError('Contract not found on chain.'); setFetching(false); return }

      const built = {
        id:           contractId,
        escrowId,
        title:        data.description || contractId,
        client:       data.buyer?.toString?.() || data.buyer,
        freelancer:   data.seller?.toString?.() || data.seller,
        arbitrator:   data.arbitrator?.toString?.() || null,
        amount:       stroopsToXlm(data.amount),
        token:        'XLM',
        status:       mapOnChainState(data.state),
        deadline:     data.deadline ? new Date(Number(data.deadline) * 1000).toISOString().split('T')[0] : '',
        createdAt:    new Date().toISOString(),
        network:      NETWORK,
        fromInvite:   true,
      }
      setFetchedContract(built)
      onAddContract?.(built)
      setFetching(false)
    }).catch(err => {
      console.error('sorobanGetEscrow failed:', err)
      setFetchError(err?.message || 'Failed to load contract from chain.')
      setFetching(false)
    })
  }, [wallet, localContract, escrowId, contractId, onAddContract])

  // Open chat as soon as contract is available
  useEffect(() => {
    if (wallet && contract) onOpen(contract)
  }, [wallet, contract, onOpen])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: 24 }}>
      <div className="card" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: '40px 32px' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>💬</div>
        <h2 style={{ marginBottom: 8 }}>You've been invited to a chat</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 8, lineHeight: 1.7 }}>
          Private workspace for contract:
        </p>
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 16px',
          fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent)',
          marginBottom: 24,
        }}>
          {contractId}
        </div>

        {!wallet ? (
          <>
            <div className="alert alert-info" style={{ marginBottom: 20, textAlign: 'left' }}>
              ⚡ Connect your Stellar wallet to verify your identity and join the chat.
              Only the client and freelancer of this contract can send messages.
            </div>
            <button className="btn btn-primary btn-lg btn-full" onClick={onConnect}>
              Connect Wallet to Join
            </button>
          </>
        ) : fetching ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading contract from Stellar...</span>
          </div>
        ) : fetchError ? (
          <div className="alert alert-danger" style={{ textAlign: 'left' }}>
            ❌ {fetchError}
          </div>
        ) : contract ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--green)', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Opening chat...</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// Map Soroban EscrowState enum to our UI status strings
function mapOnChainState(state) {
  if (!state) return 'ACTIVE'
  const s = typeof state === 'string' ? state : Object.keys(state)[0]
  const map = {
    AwaitingDeposit: 'AWAITING_DEPOSIT',
    Funded:          'ACTIVE',
    WorkSubmitted:   'SUBMITTED',
    Disputed:        'DISPUTED',
    Completed:       'COMPLETED',
    Refunded:        'REFUNDED',
  }
  return map[s] || 'ACTIVE'
}
