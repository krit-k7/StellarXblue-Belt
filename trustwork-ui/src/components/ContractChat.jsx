// =============================================================================
// ContractChat.jsx — Per-contract private chat room
//
// Features:
//  - Private to client + freelancer (identified by wallet address)
//  - Invite link generation (share with freelancer to join)
//  - Text messages with timestamps
//  - File/image attachments (drag-drop or click)
//  - System event messages (contract state changes)
//  - Work submission directly from chat
//  - Unread badge
//  - Messages persist in localStorage
// =============================================================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat, seedChatIfEmpty } from '../hooks/useChat'
import { truncateAddr, CONTRACT_STATES } from '../utils/contract'
import { syncContractFromChain } from '../utils/stellar'

const ACCEPTED_ATTACH = '.pdf,.zip,.png,.jpg,.jpeg,.gif,.mp4,.txt,.md,.json,.docx,.svg'

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getInitial(addr = '') {
  return addr.slice(0, 1).toUpperCase() || '?'
}

function avatarColor(addr = '') {
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4']
  let hash = 0
  for (let i = 0; i < addr.length; i++) hash = addr.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ContractChat({ contract, wallet, role, onSubmitWork, onApprove, onDispute }) {
  const { messages, sendMessage, postSystemEvent, useSupabase } = useChat(contract.id)
  const [text, setText]           = useState('')
  const [attachments, setAttachments] = useState([])
  const [dragging, setDragging]   = useState(false)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [disputeText, setDisputeText] = useState('')
  const [showDisputeBox, setShowDisputeBox] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  // liveStatus: synced from chain so client sees SUBMITTED even if local cache is stale
  const [liveStatus, setLiveStatus] = useState(contract.status)
  const bottomRef  = useRef(null)
  const fileRef    = useRef(null)
  const inputRef   = useRef(null)

  // Role is passed explicitly from ContractDetail — no address comparison needed
  // Falls back to address comparison if role prop not provided
  const walletNorm      = (wallet || '').trim().toUpperCase()
  const clientNorm      = (contract.client || '').trim().toUpperCase()
  const freelancerNorm  = (contract.freelancer || '').trim().toUpperCase()

  const isClientSafe     = role === 'client'     || walletNorm === clientNorm
  const isFreelancerSafe = role === 'freelancer'  || walletNorm === freelancerNorm
  const isMemberSafe     = isClientSafe || isFreelancerSafe

  // Keep legacy vars for senderRole
  const isClient     = isClientSafe
  const isFreelancer = isFreelancerSafe
  const isMember     = isMemberSafe
  const senderRole   = isClientSafe ? 'client' : isFreelancerSafe ? 'freelancer' : 'observer'

  // Sync on-chain status when chat tab opens — catches stale local state
  useEffect(() => {
    if (contract?.escrowId && wallet) {
      syncContractFromChain(contract, wallet)
        .then(synced => setLiveStatus(synced.status))
        .catch(() => {})
    }
  }, [contract?.id, wallet])

  // Keep liveStatus in sync if parent contract prop updates
  useEffect(() => {
    setLiveStatus(contract.status)
  }, [contract.status])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Invite link — encodes contract ID in URL hash, opens directly to chat
  const inviteLink = `${window.location.origin}${window.location.pathname}#chat/${contract.id}`

  function copyInvite() {
    navigator.clipboard?.writeText(inviteLink)
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 2500)
  }

  // ── Send message ───────────────────────────────────────────────────────────
  function handleSend() {
    if (!text.trim() && attachments.length === 0) return
    sendMessage(wallet, senderRole, text, attachments)
    setText('')
    setAttachments([])
    inputRef.current?.focus()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── File attachment ────────────────────────────────────────────────────────
  function processFiles(files) {
    const newAttachments = Array.from(files).map(f => ({
      name: f.name,
      size: f.size,
      type: f.type,
      url: URL.createObjectURL(f),
    }))
    setAttachments(a => [...a, ...newAttachments])
  }

  function handleFileDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFiles(e.dataTransfer.files)
  }

  // ── Submit work from chat ──────────────────────────────────────────────────
  async function handleSubmitFromChat() {
    const note = text.trim() || 'Work submitted via chat.'
    // 1. Post the submission card into chat
    await postSystemEvent(`📤 **Work Submitted** — Freelancer marked work as complete.\n\n"${note}"\n\nClient: please review and approve or raise a dispute below.`, 'submission')
    // 2. Trigger the state change
    await onSubmitWork?.({ note, deliverables: [], uploadedFiles: [] })
    // 3. Force liveStatus update immediately — don't wait for prop re-render
    setLiveStatus(CONTRACT_STATES.SUBMITTED)
    setText('')
  }

  // ── Group messages by date ─────────────────────────────────────────────────
  const grouped = messages.reduce((acc, msg) => {
    const day = new Date(msg.ts).toDateString()
    if (!acc[day]) acc[day] = []
    acc[day].push(msg)
    return acc
  }, {})

  // ── Not a member view ──────────────────────────────────────────────────────
  if (!isMemberSafe) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🔒</div>
          <h3 style={{ color: 'var(--text-heading)', marginBottom: 8 }}>Private Chat Room</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 24, lineHeight: 1.7 }}>
            This chat is private to the client and freelancer of contract <strong>{contract.id}</strong>.
            Connect the correct wallet to join.
          </p>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Client: {truncateAddr(contract.client)}<br />
            Freelancer: {truncateAddr(contract.freelancer)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── Chat header ─────────────────────────────────────────────────────── */}
      <div className="card mb-16" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', position: 'absolute', bottom: 0, right: 0, border: '2px solid var(--bg-card)', boxShadow: '0 0 6px var(--green)' }} />
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
                💬
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                {contract.title}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Private · {truncateAddr(contract.client)} & {truncateAddr(contract.freelancer)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Invite button — client shares link with freelancer */}
            {isClientSafe && (
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowInvite(s => !s)}
                >
                  🔗 Invite Freelancer
                </button>
                {showInvite && (
                  <div className="invite-dropdown" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)', padding: 16, width: 'min(320px, calc(100vw - 28px))',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 50,
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.875rem', marginBottom: 6 }}>
                      Share with Freelancer
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
                      Send this link to your freelancer. They'll join this private chat room when they open it with their wallet connected.
                    </p>
                    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text)', wordBreak: 'break-all', marginBottom: 10 }}>
                      {inviteLink}
                    </div>
                    <button className="btn btn-primary btn-full btn-sm" onClick={copyInvite}>
                      {inviteCopied ? '✅ Copied!' : '📋 Copy Link'}
                    </button>
                  </div>
                )}
              </div>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', alignSelf: 'center', background: 'var(--bg-elevated)', padding: '4px 10px', borderRadius: 10, border: '1px solid var(--border)' }}>
              {isClientSafe ? '👤 Client' : '💼 Freelancer'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────────── */}
      <div
        className="chat-msg-list"
        style={{
          height: 460, overflowY: 'auto',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px',
          display: 'flex', flexDirection: 'column', gap: 0,
          marginBottom: 12,
        }}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleFileDrop}
      >
        {dragging && (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--accent-glow)',
            border: '2px dashed var(--accent)', borderRadius: 'var(--radius)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 600, zIndex: 10,
          }}>
            Drop files to attach
          </div>
        )}

        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>💬</div>
            <div style={{ fontWeight: 600, color: 'var(--text-heading)', marginBottom: 6 }}>Start the conversation</div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>
              This is your private workspace for <strong>{contract.title}</strong>.<br />
              Discuss requirements, share updates, and submit work here.
            </div>
          </div>
        )}

        {Object.entries(grouped).map(([day, dayMsgs]) => (
          <div key={day}>
            {/* Date separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(day).toDateString() === new Date().toDateString() ? 'Today' : day}
              </span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {dayMsgs.map((msg, i) => {
              const isMe = msg.sender === wallet
              const isSystem = msg.type === 'system' || msg.senderRole === 'system'
              const prevMsg = dayMsgs[i - 1]
              const showAvatar = !prevMsg || prevMsg.sender !== msg.sender

              if (isSystem) {
                // ── Submission card — shows approve/dispute inline ──────────
                if (msg.type === 'submission') {
                  return (
                    <div key={msg.id} style={{ margin: '12px 0' }}>
                      <div style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid rgba(245,158,11,0.4)',
                        borderLeft: '3px solid var(--yellow)',
                        borderRadius: 'var(--radius)',
                        padding: '14px 16px',
                      }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: '1.1rem' }}>📤</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                            Work Submitted
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {formatTime(msg.ts)}
                          </span>
                        </div>

                        {/* Note */}
                        <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                          {msg.text.replace(/^\*\*Work Submitted\*\* — Freelancer marked work as complete\.\n\n/, '').replace(/\n\nClient: please review and approve or raise a dispute below\.$/, '')}
                        </p>

                        {/* Client action buttons — only show to CLIENT and if not yet resolved */}
                        {isClientSafe && contract.status !== CONTRACT_STATES.COMPLETED && contract.status !== CONTRACT_STATES.REFUNDED && contract.status !== CONTRACT_STATES.DISPUTED && (
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                              Review the deliverables in the <strong>Deliverables</strong> tab, then:
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                className="btn btn-success"
                                style={{ flex: 1, minWidth: 0 }}
                                disabled={actionLoading === 'approve'}
                                onClick={async () => {
                                  setActionLoading('approve')
                                  await onApprove?.()
                                  setActionLoading(null)
                                }}
                              >
                                {actionLoading === 'approve' ? '⏳ Processing...' : '✅ Approve & Release Payment'}
                              </button>
                              <button
                                className="btn btn-danger"
                                style={{ flex: 1, minWidth: 0 }}
                                onClick={() => setShowDisputeBox(s => !s)}
                              >
                                {contract.arbitrator ? '⚖️ Raise Dispute' : '⚠️ Reject Work'}
                              </button>
                            </div>

                            {showDisputeBox && (
                              <div style={{ marginTop: 10 }}>
                                <textarea
                                  className="form-textarea"
                                  placeholder={contract.arbitrator
                                    ? 'Describe the issue — what was agreed vs what was delivered. The arbitrator will review this.'
                                    : 'Describe what is wrong with the delivered work...'}
                                  value={disputeText}
                                  onChange={e => setDisputeText(e.target.value)}
                                  rows={2}
                                  style={{ marginBottom: 8, fontSize: '0.82rem' }}
                                />
                                {contract.arbitrator && (
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                                    ⚖️ Arbitrator <strong style={{ fontFamily: 'monospace' }}>{truncateAddr(contract.arbitrator)}</strong> will be notified and will decide the outcome.
                                  </div>
                                )}
                                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setShowDisputeBox(false)}>
                                    Cancel
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    disabled={!disputeText.trim() || actionLoading === 'dispute'}
                                    onClick={async () => {
                                      setActionLoading('dispute')
                                      await onDispute?.(disputeText)
                                      setActionLoading(null)
                                      setShowDisputeBox(false)
                                      setDisputeText('')
                                    }}
                                  >
                                    {actionLoading === 'dispute' ? '⏳...' : contract.arbitrator ? '⚖️ Raise Dispute' : '⚠️ Reject'}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Freelancer waiting state */}
                        {isFreelancerSafe && contract.status !== CONTRACT_STATES.COMPLETED && contract.status !== CONTRACT_STATES.REFUNDED && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
                            ⏳ Awaiting client review. You can auto-claim after the review period expires.
                          </div>
                        )}

                        {/* Resolved state */}
                        {(contract.status === CONTRACT_STATES.COMPLETED || contract.status === CONTRACT_STATES.REFUNDED || contract.status === CONTRACT_STATES.DISPUTED) && (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg)', borderRadius: 8, padding: '8px 12px' }}>
                            {contract.status === CONTRACT_STATES.COMPLETED && '✅ Approved — payment released.'}
                            {contract.status === CONTRACT_STATES.REFUNDED && '↩️ Refunded to client.'}
                            {contract.status === CONTRACT_STATES.DISPUTED && '⚖️ Dispute raised — under arbitration.'}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }

                // ── Regular system message ─────────────────────────────────
                return (
                  <div key={msg.id} style={{ textAlign: 'center', margin: '8px 0' }}>
                    <span style={{
                      display: 'inline-block', fontSize: '0.75rem', color: 'var(--text-muted)',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      borderRadius: 20, padding: '4px 12px',
                    }}>
                      {msg.text}
                    </span>
                  </div>
                )
              }

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: 8,
                    marginBottom: 4,
                    marginTop: showAvatar ? 10 : 2,
                  }}
                >
                  {/* Avatar */}
                  {showAvatar ? (
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: avatarColor(msg.sender),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                    }}>
                      {getInitial(msg.sender)}
                    </div>
                  ) : (
                    <div style={{ width: 30, flexShrink: 0 }} />
                  )}

                  {/* Bubble */}
                  <div className="chat-bubble-wrap" style={{ maxWidth: '70%' }}>
                    {showAvatar && (
                      <div style={{
                        fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3,
                        textAlign: isMe ? 'right' : 'left',
                      }}>
                        {isMe ? 'You' : truncateAddr(msg.sender)}
                        <span style={{ marginLeft: 6, opacity: 0.6 }}>
                          {msg.senderRole === 'client' ? '(Client)' : '(Freelancer)'}
                        </span>
                      </div>
                    )}
                    <div style={{
                      background: isMe ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: isMe ? '#fff' : 'var(--text-heading)',
                      borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '10px 14px',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      border: isMe ? 'none' : '1px solid var(--border)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.text && <div>{msg.text}</div>}

                      {/* Attachments */}
                      {msg.attachments?.map((a, ai) => (
                        <a
                          key={ai}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, marginTop: 6,
                            background: isMe ? 'rgba(255,255,255,0.15)' : 'var(--bg-card)',
                            borderRadius: 8, padding: '6px 10px', textDecoration: 'none',
                            color: isMe ? '#fff' : 'var(--text-heading)',
                          }}
                        >
                          <span>📎</span>
                          <span style={{ fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.name}
                          </span>
                        </a>
                      ))}
                    </div>
                    <div style={{
                      fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3,
                      textAlign: isMe ? 'right' : 'left',
                    }}>
                      {formatTime(msg.ts)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* ── CLIENT ACTION BAR — show only to CLIENT when submission exists and not yet resolved ── */}
      {isClientSafe && messages.some(m => m.type === 'submission')
        && contract.status !== CONTRACT_STATES.COMPLETED
        && contract.status !== CONTRACT_STATES.REFUNDED
        && contract.status !== CONTRACT_STATES.DISPUTED
        && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(245,158,11,0.5)',
          borderRadius: 'var(--radius)',
          padding: '16px 18px',
          marginBottom: 10,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>📦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                Freelancer submitted work — your action required
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Review the deliverables in the <strong>Deliverables</strong> tab, then approve or raise a dispute.
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="chat-action-btns" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="btn btn-success"
              style={{ flex: 1, minWidth: 0 }}
              disabled={actionLoading === 'approve'}
              onClick={async () => {
                setActionLoading('approve')
                await onApprove?.()
                setActionLoading(null)
              }}
            >
              {actionLoading === 'approve' ? '⏳ Processing...' : '✅ Approve & Release Payment'}
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 1, minWidth: 0 }}
              onClick={() => setShowDisputeBox(s => !s)}
            >
              {contract.arbitrator ? '⚖️ Raise Dispute' : '⚠️ Reject Work'}
            </button>
          </div>

          {/* Dispute box */}
          {showDisputeBox && (
            <div style={{ marginTop: 12 }}>
              <textarea
                className="form-textarea"
                placeholder={contract.arbitrator
                  ? `Describe the issue clearly. Arbitrator (${truncateAddr(contract.arbitrator)}) will review and decide.`
                  : 'Describe what is wrong with the delivered work...'}
                value={disputeText}
                onChange={e => setDisputeText(e.target.value)}
                rows={2}
                style={{ marginBottom: 8, fontSize: '0.85rem' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => { setShowDisputeBox(false); setDisputeText('') }}>
                  Cancel
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={!disputeText.trim() || actionLoading === 'dispute'}
                  onClick={async () => {
                    setActionLoading('dispute')
                    await onDispute?.(disputeText)
                    setActionLoading(null)
                    setShowDisputeBox(false)
                    setDisputeText('')
                  }}
                >
                  {actionLoading === 'dispute' ? '⏳...' : contract.arbitrator ? '⚖️ Confirm Dispute' : '⚠️ Confirm Rejection'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Freelancer: claim after deadline ────────────────────────────────── */}
      {isFreelancerSafe && liveStatus === CONTRACT_STATES.SUBMITTED && (() => {
        const days = contract.deadline
          ? Math.ceil((new Date(contract.deadline) - new Date()) / (1000 * 60 * 60 * 24))
          : null
        return days !== null && days < -(Number(contract.reviewPeriod) || 7)
      })() && (
        <div style={{
          background: 'var(--yellow-bg)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--yellow)' }}>
            ⏰ Review period expired — you can now claim payment.
          </div>
          <button
            className="btn btn-warning btn-sm"
            disabled={actionLoading === 'claim'}
            onClick={async () => {
              setActionLoading('claim')
              await onApprove?.() // reuses approve handler — maps to claim_after_deadline
              setActionLoading(null)
            }}
          >
            {actionLoading === 'claim' ? '⏳...' : '💰 Claim'}
          </button>
        </div>
      )}

      {/* ── Attachment preview ───────────────────────────────────────────────── */}
      {attachments.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {attachments.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '5px 10px', fontSize: '0.78rem',
            }}>
              <span>📎</span>
              <span style={{ color: 'var(--text-heading)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
              <button
                onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: 0 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input bar ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'flex-end',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 12px',
      }}>
        {/* Attach file */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px 10px', flexShrink: 0 }}
          onClick={() => fileRef.current?.click()}
          title="Attach file"
        >
          📎
        </button>
        <input ref={fileRef} type="file" multiple accept={ACCEPTED_ATTACH} style={{ display: 'none' }} onChange={e => processFiles(e.target.files)} />

        {/* Text input */}
        <textarea
          ref={inputRef}
          className="form-textarea"
          placeholder={`Message ${isClientSafe ? 'freelancer' : 'client'}... (Enter to send, Shift+Enter for new line)`}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          style={{
            flex: 1, resize: 'none', minHeight: 38, maxHeight: 120,
            border: 'none', background: 'transparent', padding: '6px 4px',
            fontSize: '0.875rem',
          }}
        />

        {/* Submit work button — only for freelancer when contract is ACTIVE */}
        {isFreelancerSafe && liveStatus === CONTRACT_STATES.ACTIVE && (
          <button
            className="btn btn-warning btn-sm"
            style={{ flexShrink: 0, padding: '8px 12px' }}
            onClick={handleSubmitFromChat}
            title="Submit work"
          >
            📤 Submit
          </button>
        )}

        {/* Send */}
        <button
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0, padding: '8px 14px' }}
          onClick={handleSend}
          disabled={!text.trim() && attachments.length === 0}
        >
          Send ↑
        </button>
      </div>

      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
        {useSupabase
          ? <span style={{ color: 'var(--green)' }}>🟢 Real-time · Messages sync across devices</span>
          : <span style={{ color: 'var(--yellow)' }}>⚠️ Local only — <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--yellow)' }}>set up Supabase</a> for cross-device chat</span>
        }
      </div>
    </div>
  )
}
