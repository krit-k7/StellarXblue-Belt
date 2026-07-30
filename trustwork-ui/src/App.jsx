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
import { useTheme } from './hooks/useTheme'
import { loadContracts, addContract, updateContract } from './utils/contract'
import { NETWORK, sorobanGetEscrow, stroopsToXlm } from './utils/stellar'

function Toast({ toasts }) {
  return (
    <div className="toast-container" style={{
      position: 'fixed', bottom: '32px', right: '32px', zIndex: 3000,
      display: 'flex', flexDirection: 'column', gap: 12
    }}>
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`} style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)', padding: '16px 24px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          minWidth: '300px'
        }}>
          <span style={{ fontSize: '1.25rem' }}>{t.icon}</span>
          <span style={{ fontWeight: '700', color: 'var(--text-heading)', fontSize: '0.9rem' }}>{t.message}</span>
        </div>
      ))}
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
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
  const [chatContractId, setChatContractId] = useState(null)

  const walletState = useWallet()
  const { address: wallet, disconnect } = walletState
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    const DEMO_IDS = ['TW-A1B2C3', 'TW-D4E5F6', 'TW-G7H8I9', 'TW-J1K2L3']
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

  useEffect(() => {
    if (wallet) {
      const stored = loadContracts(wallet)
      setContracts(stored)
      addToast('Wallet connected', 'success', '🔗')
      setWalletOpen(false)
      if (chatContractId) {
        const found = stored.find(c => c.id === chatContractId)
        if (found) {
          setSelected(found)
          setPage('detail')
          window.history.replaceState(null, '', window.location.pathname)
        }
      }
    } else {
      setContracts([])
    }
  }, [wallet, chatContractId])

  function addToast(message, type = 'info', icon = '⚡') {
    const id = Date.now()
    setToasts(t => [...t, { id, message, type, icon }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }

  function openTx(title, description) {
    setTx({ status: 'signing', title, description, network: NETWORK })
  }
  function txSubmitting() { setTx(prev => ({ ...prev, status: 'submitting' })) }
  function txSuccess(txHash) { setTx(prev => ({ ...prev, status: 'success', txHash })) }
  function txError(error) { setTx(prev => ({ ...prev, status: 'error', error: error?.message || String(error) })) }
  function closeTx() { setTx(null) }

  function handleCreate(contract) {
    addContract(wallet, contract)
    setContracts(prev => [contract, ...prev.filter(c => c.id !== contract.id)])
    addToast(`Contract deployed`, 'success', '🔒')
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
      ACTIVE:     ['Escrow is live', 'success', '💰'],
      SUBMITTED:  ['Work submitted', 'info', '📤'],
      COMPLETED:  ['Payment released', 'success', '✅'],
      DISPUTED:   ['Dispute raised', 'error', '⚠️'],
      REFUNDED:   ['Funds refunded', 'info', '↩️'],
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

  useEffect(() => {
    if (selected) {
      const fresh = contracts.find(c => c.id === selected.id)
      if (fresh) setSelected(fresh)
    }
  }, [contracts, selected])

  return (
    <div id="root" data-theme={theme}>
      <Navbar
        page={page}
        setPage={setPage}
        wallet={wallet}
        onOpenWallet={() => setWalletOpen(true)}
        onDisconnect={handleDisconnect}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main style={{ paddingTop: '80px' }}>
        {page === 'home' && (
          <Home onConnect={() => setWalletOpen(true)} wallet={wallet} setPage={setPage} theme={theme} />
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
      </main>

      {walletOpen && (
        <WalletModal walletState={walletState} onClose={() => setWalletOpen(false)} />
      )}
      {tx && <TxModal tx={tx} onClose={closeTx} />}
      <Toast toasts={toasts} />
    </div>
  )
}
