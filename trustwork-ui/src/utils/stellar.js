// =============================================================================
// stellar.js — Soroban SDK integration (@stellar/stellar-sdk v14)
// =============================================================================

import {
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Contract,
  nativeToScVal,
  scValToNative,
  Address,
  xdr,
} from '@stellar/stellar-sdk'
import { signTransaction } from '@stellar/freighter-api'

// ── Error handling wrapper ────────────────────────────────────────────────────
function getUserFriendlyError(error) {
  const msg = error?.message || String(error)
  
  // Network errors
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
    return 'Network connection error. Please check your internet connection and try again.'
  }
  
  // Account errors
  if (msg.includes('Account not found')) {
    const addressMatch = msg.match(/Account not found: ([A-Z0-9]{56})/)
    const address = addressMatch ? addressMatch[1] : 'the specified address'
    return `The Stellar account ${address} doesn't exist or hasn't been funded yet. Please:\n1. Create a new account at https://laboratory.stellar.org/#account-creator?network=test\n2. Click "Generate keypair" and copy the Public Key\n3. Click "Get test network lumens" to fund it\n4. Use that address as the freelancer address`
  }
  
  // Freighter errors
  if (msg.includes('Freighter') || msg.includes('extension')) {
    return 'Wallet connection error. Please make sure Freighter is installed and unlocked.'
  }
  if (msg.includes('cancelled') || msg.includes('rejected') || msg.includes('User declined')) {
    return 'Transaction was cancelled. You can try again when ready.'
  }
  if (msg.includes('signing was cancelled')) {
    return 'Transaction signing was cancelled. Please try again and approve the transaction in Freighter.'
  }
  
  // Balance errors
  if (msg.includes('insufficient') || msg.includes('balance')) {
    return 'Insufficient XLM balance. Please add more XLM to your wallet and try again.'
  }
  
  // Contract errors
  if (msg.includes('InvalidState')) {
    return 'This action cannot be performed in the current contract state. Please refresh and try again.'
  }
  if (msg.includes('Unauthorized')) {
    return 'You are not authorized to perform this action. Please make sure you are using the correct wallet.'
  }
  if (msg.includes('DeadlineExpired')) {
    return 'The contract deadline has expired. This action is no longer available.'
  }
  if (msg.includes('NoArbitrator')) {
    return 'This contract does not have an arbitrator configured. Disputes cannot be raised.'
  }
  if (msg.includes('NotFound')) {
    return 'Contract not found. Please make sure the contract ID is correct.'
  }
  if (msg.includes('AlreadySubmitted')) {
    return 'Work has already been submitted for this contract.'
  }
  if (msg.includes('AlreadyCompleted')) {
    return 'This contract has already been completed.'
  }
  
  // Simulation errors
  if (msg.includes('Simulation failed')) {
    return 'Transaction simulation failed. This usually means the contract is not deployed or has an issue. Please:\n1. Click "🧪 Test Contract" to verify deployment\n2. Check the contract ID in .env file\n3. Try redeploying the contract if needed\n4. Contact support if the problem persists'
  }
  
  // Timeout errors
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return 'Transaction timed out. The network may be slow. Please try again in a moment.'
  }
  
  // RPC errors
  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.'
  }
  if (msg.includes('503') || msg.includes('service unavailable')) {
    return 'Stellar network is temporarily unavailable. Please try again in a few moments.'
  }
  
  // Generic fallback
  return 'An unexpected error occurred. Please try again or contact support if the problem persists.'
}

// Wrap async functions with error handling
async function safeInvoke(fn, ...args) {
  try {
    return await fn(...args)
  } catch (error) {
    const friendlyMessage = getUserFriendlyError(error)
    const enhancedError = new Error(friendlyMessage)
    enhancedError.originalError = error
    throw enhancedError
  }
}

// Retry wrapper for network operations
async function withRetry(fn, maxRetries = 2, delayMs = 2000) {
  let lastError
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      const msg = error?.message || String(error)
      
      // Don't retry user cancellations or validation errors
      if (msg.includes('cancelled') || msg.includes('rejected') || 
          msg.includes('Unauthorized') || msg.includes('InvalidState')) {
        throw error
      }
      
      // Retry network errors and rate limits
      if (attempt < maxRetries && (
        msg.includes('network') || msg.includes('timeout') || 
        msg.includes('fetch') || msg.includes('503') ||
        msg.includes('429') || msg.includes('rate limit') || msg.includes('Too many requests')
      )) {
        // Exponential backoff with longer delays for rate limits
        const delay = msg.includes('rate limit') || msg.includes('Too many requests') 
          ? delayMs * (attempt + 2) // 4s, 6s for rate limits
          : delayMs * (attempt + 1)  // 2s, 4s for other errors
        
        console.log(`Rate limited or network error, retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
  throw lastError
}

// ── Config ────────────────────────────────────────────────────────────────────
export const NETWORK        = import.meta.env.VITE_STELLAR_NETWORK     || 'testnet'
export const RPC_URL        = import.meta.env.VITE_RPC_URL             || 'https://soroban-testnet.stellar.org'
export const CONTRACT_ID    = import.meta.env.VITE_CONTRACT_ID         || ''

// IMPORTANT: Always use the SDK constant directly — never read from .env
// Reading from .env can introduce trailing whitespace/newlines that cause
// Freighter to reject the transaction with "Signing not possible" error.
export const NET_PASSPHRASE = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET

export const EXPLORER_BASE = NETWORK === 'mainnet'
  ? 'https://stellar.expert/explorer/public'
  : 'https://stellar.expert/explorer/testnet'

export function getServer() {
  return new rpc.Server(RPC_URL, { allowHttp: false })
}

// ── Conversions ───────────────────────────────────────────────────────────────
export function xlmToStroops(xlm) { return BigInt(Math.round(Number(xlm) * 10_000_000)) }
export function stroopsToXlm(s)   { return (Number(s) / 10_000_000).toFixed(7).replace(/\.?0+$/, '') }

function addressVal(addr) {
  return new Address(addr).toScVal()
}

// Sanitize string for Soroban Symbol type (ASCII only, max 32 chars)
function sanitizeForSymbol(str) {
  return str
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters
    .replace(/\s+/g, '_')         // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscore
    .slice(0, 32)                 // Limit to 32 characters
    .toLowerCase()                // Convert to lowercase for consistency
}

console.log('🧪 Testing sanitizeForSymbol:', {
  'Test — Milestone': sanitizeForSymbol('Test — Milestone'),
  'Special chars!@#': sanitizeForSymbol('Special chars!@#'),
  'Unicode 测试': sanitizeForSymbol('Unicode 测试')
})

// ── Core invoke ───────────────────────────────────────────────────────────────
export async function invokeContract(sourceAddress, method, args = []) {
  if (!CONTRACT_ID) throw new Error('VITE_CONTRACT_ID not set in .env')

  console.log('🔧 invokeContract called:', { method, args, contractId: CONTRACT_ID, sourceAddress })

  return withRetry(async () => {
    const server   = getServer()
    const account  = await server.getAccount(sourceAddress)
    const contract = new Contract(CONTRACT_ID)

    console.log('📋 Building transaction for method:', method)

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NET_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    console.log('🔍 Simulating transaction...')
    // Simulate
    const simResult = await server.simulateTransaction(tx)

    console.log('📊 Simulation result:', {
      error: simResult.error,
      hasResult: !!simResult.result,
      hasResults: !!simResult.results?.length,
      resultType: typeof simResult.result,
      resultsLength: simResult.results?.length || 0
    })

    // Check for simulation error (v14 style — no isSimulationError helper)
    if (simResult.error) {
      console.error('❌ Simulation failed with error:', simResult.error)
      throw new Error(`Simulation failed: ${simResult.error}`)
    }
    if (!simResult.result && simResult.results?.length === 0) {
      console.error('❌ Simulation returned no result')
      throw new Error('Simulation returned no result')
    }

    console.log('✅ Simulation successful, assembling transaction...')
    // Assemble with footprint + resource fee
    const preparedTx = rpc.assembleTransaction(tx, simResult).build()

    console.log('🖊️ Requesting signature from Freighter...')
    // Sign via Freighter — opens the extension popup
    // v6 API: signTransaction(xdr, { networkPassphrase, address })
    // Returns: { signedTxXdr: string, signerAddress: string, error: string | null }
    const signResult = await signTransaction(preparedTx.toXDR(), {
      networkPassphrase: NET_PASSPHRASE,
      address: sourceAddress,
    })

    // Handle v6 response shape
    if (signResult?.error) {
      throw new Error(`Freighter signing failed: ${signResult.error}`)
    }

    const signedXdr = signResult?.signedTxXdr || (typeof signResult === 'string' ? signResult : null)
    if (!signedXdr) throw new Error('Transaction signing was cancelled or Freighter did not respond. Please check the Freighter extension popup.')

    console.log('📤 Submitting signed transaction...')
    // Submit
    const signedTx   = TransactionBuilder.fromXDR(signedXdr, NET_PASSPHRASE)
    const sendResult = await server.sendTransaction(signedTx)

    if (sendResult.status === 'ERROR') {
      console.error('❌ Transaction submission failed:', sendResult.errorResult)
      throw new Error(`Submission failed: ${JSON.stringify(sendResult.errorResult)}`)
    }

    console.log('⏳ Polling for transaction confirmation...')
    // Poll for confirmation
    const txHash = sendResult.hash
    let getResult
    let attempts = 0

    do {
      await new Promise(r => setTimeout(r, 1500))
      getResult = await server.getTransaction(txHash)
      attempts++
      console.log(`📊 Poll attempt ${attempts}: status = ${getResult.status}`)
    } while (getResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 20)

    if (getResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      console.error('❌ Transaction was rejected by the network')
      throw new Error('Transaction was rejected by the network')
    }

    const returnVal = getResult.returnValue ? scValToNative(getResult.returnValue) : null
    console.log('✅ Transaction successful:', { txHash, returnVal })
    return { result: returnVal, txHash }
  })
}

// ── Read-only query (uses caller's account for simulation) ────────────────────
export async function queryContract(method, args = [], callerAddress = null) {
  if (!CONTRACT_ID) return null
  try {
    console.log('🔍 Query contract:', { method, args, callerAddress, contractId: CONTRACT_ID })
    
    const server   = getServer()
    const contract = new Contract(CONTRACT_ID)

    // Use caller's address if provided, otherwise fall back to a known testnet account
    const sourceAddr = callerAddress || 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'
    const account    = await server.getAccount(sourceAddr)

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NET_PASSPHRASE,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build()

    console.log('🔍 Simulating query transaction...')
    const simResult = await server.simulateTransaction(tx)

    if (simResult.error) {
      console.error(`❌ queryContract(${method}) simulation error:`, simResult.error)
      return null
    }

    // result.retval holds the return value for read-only calls
    if (simResult.result?.retval) {
      const result = scValToNative(simResult.result.retval)
      console.log('✅ Query result:', result)
      return result
    }

    // Some SDK versions put it under results[0]
    if (simResult.results?.[0]?.xdr) {
      const result = scValToNative(xdr.ScVal.fromXDR(simResult.results[0].xdr, 'base64'))
      console.log('✅ Query result (alt path):', result)
      return result
    }

    console.warn(`⚠️ queryContract(${method}) returned no result`)
    return null
  } catch (err) {
    console.error(`❌ queryContract(${method}) error:`, err?.message)
    return null
  }
}

// =============================================================================
// Contract function wrappers
// =============================================================================

export async function sorobanCreateEscrow(sourceAddress, {
  buyer, seller, arbitrator, amountXlm, tokenAddress, deadlineUnix, description,
}) {
  return safeInvoke(async () => {
    console.log('🔷 sorobanCreateEscrow v2.0 - FIXED: ASCII-only Symbol sanitization')
    console.log('🔷 Creating escrow with params:', {
      buyer, seller, arbitrator, amountXlm, tokenAddress, deadlineUnix, description
    })
    
    // Sanitize description for Soroban Symbol type
    const sanitizedDescription = sanitizeForSymbol(description)
    console.log('🧹 Sanitized description:', { original: description, sanitized: sanitizedDescription })
    
    const args = [
      addressVal(buyer),
      addressVal(seller),
      arbitrator
        ? nativeToScVal({ tag: 'Some', values: [new Address(arbitrator).toScVal()] }, { type: 'option' })
        : nativeToScVal(null, { type: 'option' }),
      nativeToScVal(xlmToStroops(amountXlm), { type: 'i128' }),
      addressVal(tokenAddress),
      nativeToScVal(BigInt(deadlineUnix), { type: 'u64' }),
      nativeToScVal(sanitizedDescription, { type: 'symbol' }),
    ]
    
    console.log('✅ Args prepared, calling invokeContract...')
    const result = await invokeContract(sourceAddress, 'create_escrow', args)
    console.log('✅ Create escrow successful:', result)
    return result
  })
}

export async function sorobanDeposit(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    console.log('🚀 sorobanDeposit v6.0 - Enhanced error handling, retry mechanism, and fallback support')
    console.log('📋 Deposit parameters:', { sourceAddress, escrowId, escrowIdType: typeof escrowId })
    
    // Step 1: Approve the escrow contract to spend the buyer's XLM
    const server  = getServer()
    const account = await server.getAccount(sourceAddress)

    // Get the escrow config to know the amount and token
    console.log('🔍 Querying escrow data for ID:', escrowId)
    let escrowData
    let retries = 3
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        escrowData = await sorobanGetEscrow(escrowId, sourceAddress)
        if (escrowData) {
          console.log('✅ Escrow data retrieved on attempt', attempt, ':', escrowData)
          break
        } else {
          console.warn(`⚠️ Escrow data is null on attempt ${attempt}`)
        }
      } catch (error) {
        console.error(`❌ Failed to get escrow data on attempt ${attempt}:`, error)
        if (attempt === retries) {
          throw new Error(`Failed to load escrow data for ID ${escrowId} after ${retries} attempts. The escrow might not exist or there might be a network issue.`)
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }
    
    if (!escrowData) {
      throw new Error(`Escrow ${escrowId} not found after ${retries} attempts. The contract creation might have failed or the escrow ID is invalid.`)
    }

    console.log('📊 Account info:', {
      sequence: account.sequence,
      sequenceType: typeof account.sequence,
      sequenceLedger: account.sequenceLedger,
      sequenceLedgerType: typeof account.sequenceLedger
    })

    const tokenContract = new Contract(escrowData.token?.toString() || getXlmSac())
    const escrowContractAddr = new Address(CONTRACT_ID)

    console.log('🏦 Token contract setup:', {
      tokenAddress: escrowData.token?.toString() || getXlmSac(),
      escrowContractAddr: CONTRACT_ID,
      amount: escrowData.amount
    })

    // Token approval expiry ledger
    // CRITICAL: We need the LEDGER number, not the account sequence number!
    // Account sequence is a huge number, ledger number is much smaller
    // Get current ledger from the ledger info
    const ledgerInfo = await server.getLatestLedger()
    const currentLedger = ledgerInfo.sequence
    const ledgersFor1Day = 17_280
    
    // Calculate expiry - 1 day ahead
    const expiryLedger = currentLedger + ledgersFor1Day
    
    console.log('🔍 Token approval expiry calculation:', {
      ledgerSequence: ledgerInfo.sequence,
      currentLedger,
      ledgersAdded: ledgersFor1Day,
      expiryLedger,
      expiryType: typeof expiryLedger,
      isInteger: Number.isInteger(expiryLedger),
      isValidU32: expiryLedger >= 0 && expiryLedger <= 4_294_967_295,
      daysValid: 1
    })
    
    // Validate before using
    if (!Number.isInteger(expiryLedger) || expiryLedger < 0 || expiryLedger > 4_294_967_295) {
      throw new Error(`Invalid expiry ledger calculated: ${expiryLedger}. Current ledger: ${currentLedger}`)
    }

    const approveTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NET_PASSPHRASE,
    })
      .addOperation(tokenContract.call(
        'approve',
        new Address(sourceAddress).toScVal(),
        escrowContractAddr.toScVal(),
        nativeToScVal(escrowData.amount, { type: 'i128' }),
        nativeToScVal(expiryLedger, { type: 'u32' }),
      ))
      .setTimeout(30)
      .build()

    const approveSimResult = await server.simulateTransaction(approveTx)
    if (approveSimResult.error) throw new Error(`Approve simulation failed: ${approveSimResult.error}`)

    const preparedApproveTx = rpc.assembleTransaction(approveTx, approveSimResult).build()
    const approveSignResult = await signTransaction(preparedApproveTx.toXDR(), {
      networkPassphrase: NET_PASSPHRASE,
      address: sourceAddress,
    })
    if (approveSignResult?.error) throw new Error(`Approve signing failed: ${approveSignResult.error}`)
    const approveSignedXdr = approveSignResult?.signedTxXdr || (typeof approveSignResult === 'string' ? approveSignResult : null)
    if (!approveSignedXdr) throw new Error('Approve transaction signing was cancelled')

    const approveSignedTx = TransactionBuilder.fromXDR(approveSignedXdr, NET_PASSPHRASE)
    const approveSend     = await server.sendTransaction(approveSignedTx)
    if (approveSend.status === 'ERROR') throw new Error('Approve transaction failed')

    // Wait for approve to confirm
    let approveResult
    let attempts = 0
    do {
      await new Promise(r => setTimeout(r, 1500))
      approveResult = await server.getTransaction(approveSend.hash)
      attempts++
    } while (approveResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND && attempts < 15)

    if (approveResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Approve transaction was rejected')
    }

    // Step 2: Now call deposit on the escrow contract
    return invokeContract(sourceAddress, 'deposit', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanSubmitWork(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    return invokeContract(sourceAddress, 'submit_work', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanApprove(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    return invokeContract(sourceAddress, 'approve_and_release', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanRefund(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    return invokeContract(sourceAddress, 'refund', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanRaiseDispute(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    return invokeContract(sourceAddress, 'raise_dispute', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanResolveDispute(sourceAddress, escrowId, resolution) {
  return safeInvoke(async () => {
    let resVal
    if (resolution === 'freelancer') {
      resVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('ReleaseToSeller')])
    } else if (resolution === 'client') {
      resVal = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('RefundToBuyer')])
    } else {
      const pct = parseInt(resolution.split(':')[1] || '50', 10)
      resVal = xdr.ScVal.scvVec([
        xdr.ScVal.scvSymbol('Split'),
        nativeToScVal(pct, { type: 'u32' }),
      ])
    }
    return invokeContract(sourceAddress, 'resolve_dispute', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
      resVal,
    ])
  })
}

export async function sorobanClaimAfterDeadline(sourceAddress, escrowId) {
  return safeInvoke(async () => {
    return invokeContract(sourceAddress, 'claim_after_deadline', [
      nativeToScVal(BigInt(escrowId), { type: 'u64' }),
    ])
  })
}

export async function sorobanGetEscrow(escrowId, callerAddress = null) {
  const result = await queryContract('get_escrow', [
    nativeToScVal(BigInt(escrowId), { type: 'u64' }),
  ], callerAddress)
  return result
}

// Fetch fresh on-chain state and merge with local contract data
export async function syncContractFromChain(localContract, callerAddress = null) {
  if (!localContract?.escrowId) return localContract
  try {
    const onChain = await sorobanGetEscrow(localContract.escrowId, callerAddress)
    if (!onChain) return localContract

    // Map on-chain state to UI status
    const stateMap = {
      AwaitingDeposit: 'AWAITING_DEPOSIT',
      Funded:          'ACTIVE',
      WorkSubmitted:   'SUBMITTED',
      Disputed:        'DISPUTED',
      Completed:       'COMPLETED',
      Refunded:        'REFUNDED',
    }
    const onChainState = typeof onChain.state === 'string'
      ? onChain.state
      : Object.keys(onChain.state || {})[0] || 'Funded'

    return {
      ...localContract,
      status: stateMap[onChainState] || localContract.status,
    }
  } catch {
    return localContract
  }
}

export async function sorobanEscrowCount() {
  return queryContract('escrow_count', [])
}

// Test contract deployment and basic functionality
export async function testContractDeployment(callerAddress) {
  console.log('🧪 Testing contract deployment...')
  
  try {
    // Test 0: Check RPC connectivity
    console.log('🌐 Test 0: Checking RPC connectivity...')
    const server = getServer()
    const latestLedger = await server.getLatestLedger()
    console.log('✅ RPC is working! Latest ledger:', latestLedger.sequence)
    
    // Test 1: Check if contract exists by calling escrow_count
    console.log('📊 Test 1: Calling escrow_count...')
    const count = await sorobanEscrowCount()
    console.log('✅ Contract is deployed! Current escrow count:', count)
    
    // Test 2: Try to get a non-existent escrow (should return null, not error)
    console.log('📊 Test 2: Querying non-existent escrow...')
    const nonExistent = await sorobanGetEscrow(999999, callerAddress)
    console.log('✅ Query test passed. Non-existent escrow result:', nonExistent)
    
    return { 
      deployed: true, 
      count, 
      working: true, 
      rpcWorking: true,
      latestLedger: latestLedger.sequence 
    }
  } catch (error) {
    console.error('❌ Contract test failed:', error)
    
    // Try to determine what failed
    let rpcWorking = false
    try {
      const server = getServer()
      await server.getLatestLedger()
      rpcWorking = true
    } catch (rpcError) {
      console.error('❌ RPC connectivity failed:', rpcError)
    }
    
    return { 
      deployed: false, 
      error: error.message, 
      working: false,
      rpcWorking,
      details: error.stack
    }
  }
}

// XLM SAC addresses
export const XLM_SAC_TESTNET = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'
export const XLM_SAC_MAINNET = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
export function getXlmSac() {
  return NETWORK === 'mainnet' ? XLM_SAC_MAINNET : XLM_SAC_TESTNET
}

export async function getXlmBalance(address) {
  try {
    const server  = getServer()
    const account = await server.getAccount(address)
    const bal     = account.balances?.find(b => b.asset_type === 'native')
    return bal ? parseFloat(bal.balance) : 0
  } catch { return 0 }
}
