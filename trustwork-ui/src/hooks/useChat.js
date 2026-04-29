import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabase } from '../lib/supabase'

const LS_KEY = (id) => `tw_chat_${id}`

function lsLoad(id) {
  try { return JSON.parse(localStorage.getItem(LS_KEY(id)) || '[]') }
  catch { return [] }
}

function lsSave(id, msgs) {
  try { localStorage.setItem(LS_KEY(id), JSON.stringify(msgs)) }
  catch { /* storage full */ }
}

function fromRow(row) {
  return {
    id:          row.id,
    contractId:  row.contract_id,
    sender:      row.sender,
    senderRole:  row.sender_role,
    text:        row.text,
    attachments: row.attachments || [],
    type:        row.type || 'text',
    ts:          row.ts,
  }
}

export function useChat(contractId) {
  const [messages, setMessages] = useState([])
  const [isSupabase, setIsSupabase] = useState(false)

  // Stable refs — never cause re-renders
  const sbRef      = useRef(null)
  const channelRef = useRef(null)
  const readyRef   = useRef(false)  // true once Supabase client is resolved

  // ── Step 1: resolve Supabase client exactly once ───────────────────────────
  useEffect(() => {
    let cancelled = false
    getSupabase().then(sb => {
      if (cancelled) return
      sbRef.current = sb || null
      readyRef.current = true
      setIsSupabase(!!sb)
    })
    return () => { cancelled = true }
  }, [])

  // ── Step 2: load messages + subscribe once Supabase is ready ──────────────
  // Depends only on contractId and isSupabase (which flips once, from false→true)
  useEffect(() => {
    if (!contractId || !readyRef.current) return

    const sb = sbRef.current

    // ── Load initial messages ────────────────────────────────────────────────
    if (sb) {
      sb.from('messages')
        .select('*')
        .eq('contract_id', contractId)
        .order('ts', { ascending: true })
        .then(({ data, error }) => {
          if (error) { console.warn('Chat load:', error.message); return }
          setMessages((data || []).map(fromRow))
        })
    } else {
      setMessages(lsLoad(contractId))
      return // no subscription needed for localStorage mode
    }

    // ── Real-time subscription ───────────────────────────────────────────────
    // Tear down any existing channel before creating a new one
    if (channelRef.current) {
      try { sb.removeChannel(channelRef.current) } catch { /* ignore */ }
      channelRef.current = null
    }

    // Build channel fresh — .on() must be called BEFORE .subscribe()
    const channelName = `chat_${contractId}_${Date.now()}`
    const ch = sb.channel(channelName)

    ch.on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
        filter: `contract_id=eq.${contractId}`,
      },
      ({ new: row }) => {
        const msg = fromRow(row)
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
      }
    ).subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.warn('Realtime channel error for', contractId)
      }
    })

    channelRef.current = ch

    // Cleanup: remove channel when contractId changes or component unmounts
    return () => {
      if (channelRef.current) {
        try { sb.removeChannel(channelRef.current) } catch { /* ignore */ }
        channelRef.current = null
      }
    }
  }, [contractId, isSupabase])

  // ── Persist to localStorage when not using Supabase ───────────────────────
  useEffect(() => {
    if (!isSupabase && contractId && messages.length > 0) {
      lsSave(contractId, messages)
    }
  }, [messages, contractId, isSupabase])

  // ── sendMessage ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (sender, senderRole, text, attachments = []) => {
    const trimmed = text?.trim() || ''
    if (!trimmed && attachments.length === 0) return

    const sb = sbRef.current
    if (sb) {
      const { error } = await sb.from('messages').insert({
        contract_id: contractId,
        sender,
        sender_role: senderRole,
        text:        trimmed,
        attachments,
        type:        'text',
      })
      if (error) console.warn('Send error:', error.message)
    } else {
      setMessages(prev => [...prev, {
        id:         `${Date.now()}-${Math.random()}`,
        contractId,
        sender,
        senderRole,
        text:       trimmed,
        attachments,
        type:       'text',
        ts:         new Date().toISOString(),
      }])
    }
  }, [contractId])

  // ── postSystemEvent ────────────────────────────────────────────────────────
  const postSystemEvent = useCallback(async (text, type = 'system') => {
    const sb = sbRef.current
    if (sb) {
      const { error } = await sb.from('messages').insert({
        contract_id: contractId,
        sender:      'TrustWork',
        sender_role: 'system',
        text,
        attachments: [],
        type,
      })
      if (error) console.warn('postSystemEvent error:', error.message)
    } else {
      setMessages(prev => [...prev, {
        id:         `${Date.now()}-${Math.random()}`,
        contractId,
        sender:     'TrustWork',
        senderRole: 'system',
        text,
        attachments: [],
        type,
        ts:         new Date().toISOString(),
      }])
    }
  }, [contractId])

  return { messages, sendMessage, postSystemEvent, useSupabase: isSupabase }
}

export function seedChatIfEmpty() {}
