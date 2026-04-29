// =============================================================================
// useWallet.js — Freighter wallet integration (@stellar/freighter-api v6)
// =============================================================================

import { useState, useEffect, useCallback } from 'react'
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  getNetwork,
} from '@stellar/freighter-api'

const TESTNET_PASSPHRASE = 'Test SDF Network ; September 2015'
const MAINNET_PASSPHRASE = 'Public Global Stellar Network ; September 2015'

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

// ---------------------------------------------------------------------------
// Demo shim — used when user explicitly picks "Demo Wallet"
// ---------------------------------------------------------------------------
const DEMO_ADDRESSES = [
  'GDEMO7KPQTRUSTWORK1234STELLAR56789ABCDEF',
  'GCLIENT9XYZFREELANCER456STELLAR789DEMO12',
]

async function connectDemo() {
  await delay(900)
  return {
    address: DEMO_ADDRESSES[Math.floor(Math.random() * DEMO_ADDRESSES.length)],
    network: 'TESTNET',
    networkPassphrase: TESTNET_PASSPHRASE,
  }
}

// ---------------------------------------------------------------------------
// useWallet hook
// ---------------------------------------------------------------------------
export function useWallet() {
  const [address, setAddress]       = useState(null)
  const [network, setNetwork]       = useState(null)
  const [networkOk, setNetworkOk]   = useState(true)
  const [installed, setInstalled]   = useState(null)  // null = checking
  const [connecting, setConnecting] = useState(false)
  const [error, setError]           = useState(null)

  function applyAccount(addr, net, passphrase) {
    setAddress(addr)
    setNetwork(net)
    setNetworkOk(
      passphrase === TESTNET_PASSPHRASE ||
      passphrase === MAINNET_PASSPHRASE
    )
  }

  // On mount: detect Freighter and restore session if already allowed
  useEffect(() => {
    async function init() {
      // Freighter injects into the page asynchronously after load.
      // We retry a few times with increasing delays before giving up.
      let hasExtension = false

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const connResult = await isConnected()
          if (connResult?.isConnected === true) {
            hasExtension = true
            break
          }
        } catch { /* ignore */ }

        // Wait before retrying: 200ms, 400ms, 700ms, 1200ms
        if (attempt < 4) {
          await delay([200, 400, 700, 1200][attempt])
        }
      }

      if (!hasExtension) {
        setInstalled(false)
        return
      }

      setInstalled(true)

      // Check if user already approved this site
      try {
        const allowResult = await isAllowed()
        if (allowResult?.isAllowed) {
          const addrResult = await getAddress()
          const netResult  = await getNetwork()
          if (addrResult?.address) {
            applyAccount(
              addrResult.address,
              netResult?.network || 'TESTNET',
              netResult?.networkPassphrase || TESTNET_PASSPHRASE
            )
          }
        }
      } catch { /* session restore failed silently */ }
    }
    init()
  }, [])

  // connect — called when user picks a wallet in the modal
  const connect = useCallback(async (walletType = 'freighter') => {
    setConnecting(true)
    setError(null)

    try {
      // ── Demo mode ──────────────────────────────────────────────────────────
      if (walletType === 'demo') {
        const { address: addr, network: net, networkPassphrase } = await connectDemo()
        applyAccount(addr, net, networkPassphrase)
        setInstalled(true)
        return addr
      }

      // ── Real Freighter ─────────────────────────────────────────────────────
      // Re-check in case extension loaded after initial mount detection
      let connResult
      for (let attempt = 0; attempt < 3; attempt++) {
        connResult = await isConnected()
        if (connResult?.isConnected) break
        await delay(300)
      }

      if (!connResult?.isConnected) {
        setInstalled(false)
        setError('Freighter wallet extension is not installed. Please install it from the Chrome Web Store or Firefox Add-ons and try again.')
        return null
      }

      setInstalled(true)

      // requestAccess() opens the Freighter popup asking user to approve
      const accessResult = await requestAccess()
      if (accessResult?.error) {
        const errorMsg = accessResult.error.toLowerCase()
        if (errorMsg.includes('user declined') || errorMsg.includes('rejected')) {
          setError('Connection request was declined. Please try again and approve the connection in Freighter.')
        } else if (errorMsg.includes('locked')) {
          setError('Freighter wallet is locked. Please unlock it and try again.')
        } else {
          setError(`Freighter error: ${accessResult.error}`)
        }
        return null
      }

      const addrResult = await getAddress()
      const netResult  = await getNetwork()

      if (!addrResult?.address) {
        setError('Could not retrieve wallet address from Freighter. Please make sure you have an account set up.')
        return null
      }

      applyAccount(
        addrResult.address,
        netResult?.network || 'TESTNET',
        netResult?.networkPassphrase || TESTNET_PASSPHRASE
      )

      return addrResult.address
    } catch (err) {
      const errorMsg = err?.message || ''
      if (errorMsg.includes('timeout')) {
        setError('Connection timed out. Please check if Freighter is responding and try again.')
      } else if (errorMsg.includes('network')) {
        setError('Network error. Please check your internet connection and try again.')
      } else {
        setError(errorMsg || 'Failed to connect wallet. Please try again.')
      }
      return null
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setAddress(null)
    setNetwork(null)
    setNetworkOk(true)
    setError(null)
  }, [])

  return {
    address,
    network,
    networkOk,
    installed,   // null=checking, true=found, false=not found
    connecting,
    error,
    connect,
    disconnect,
  }
}
