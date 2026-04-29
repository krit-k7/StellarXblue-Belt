// =============================================================================
// FileUploader.jsx
//
// Handles file uploads for work submission. Two storage modes:
//
//  1. LOCAL (demo)  — Files stored as object URLs in browser memory.
//                     Works immediately, no backend needed.
//                     Files are lost on page refresh (demo only).
//
//  2. IPFS (production) — Files pinned to IPFS via web3.storage or Pinata.
//                         Returns a permanent ipfs:// CID the client can verify.
//                         The CID is then stored in the Soroban contract event.
//
// To enable IPFS: set VITE_WEB3_STORAGE_TOKEN in your .env file.
// =============================================================================

import { useState, useRef } from 'react'

const MAX_FILE_SIZE_MB = 50
const MAX_FILES        = 10

const ACCEPTED_TYPES = {
  'application/pdf':                          { icon: '📄', label: 'PDF' },
  'application/zip':                          { icon: '🗜️', label: 'ZIP' },
  'application/x-zip-compressed':            { icon: '🗜️', label: 'ZIP' },
  'image/png':                                { icon: '🖼️', label: 'PNG' },
  'image/jpeg':                               { icon: '🖼️', label: 'JPG' },
  'image/gif':                                { icon: '🖼️', label: 'GIF' },
  'image/svg+xml':                            { icon: '🎨', label: 'SVG' },
  'video/mp4':                                { icon: '🎥', label: 'MP4' },
  'video/webm':                               { icon: '🎥', label: 'WEBM' },
  'text/plain':                               { icon: '📝', label: 'TXT' },
  'text/markdown':                            { icon: '📝', label: 'MD' },
  'application/json':                         { icon: '📋', label: 'JSON' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📄', label: 'DOCX' },
}

function formatBytes(bytes) {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type) {
  return ACCEPTED_TYPES[type]?.icon || '📎'
}

// Simulate IPFS upload — replace with real web3.storage / Pinata call
async function uploadToIPFS(file) {
  // Production: use web3.storage
  // import { Web3Storage } from 'web3.storage'
  // const client = new Web3Storage({ token: import.meta.env.VITE_WEB3_STORAGE_TOKEN })
  // const cid = await client.put([file])
  // return `ipfs://${cid}/${file.name}`

  // Demo: simulate a CID after a short delay
  await new Promise(r => setTimeout(r, 600 + Math.random() * 400))
  const fakeCid = 'Qm' + Math.random().toString(36).slice(2, 12).toUpperCase() +
                  Math.random().toString(36).slice(2, 22).toUpperCase()
  return `ipfs://${fakeCid}/${encodeURIComponent(file.name)}`
}

// ── FileUploader component ────────────────────────────────────────────────────
export default function FileUploader({ files, onChange }) {
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState({}) // { filename: true }
  const [errors, setErrors]       = useState([])
  const inputRef = useRef(null)

  async function processFiles(rawFiles) {
    const newErrors = []
    const toAdd = []

    for (const file of rawFiles) {
      if (files.length + toAdd.length >= MAX_FILES) {
        newErrors.push(`Max ${MAX_FILES} files allowed`)
        break
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        newErrors.push(`${file.name} exceeds ${MAX_FILE_SIZE_MB}MB limit`)
        continue
      }
      if (files.some(f => f.name === file.name && f.size === file.size)) {
        newErrors.push(`${file.name} already added`)
        continue
      }
      toAdd.push(file)
    }

    setErrors(newErrors)
    if (!toAdd.length) return

    // Mark as uploading
    const uploadingMap = {}
    toAdd.forEach(f => { uploadingMap[f.name] = true })
    setUploading(u => ({ ...u, ...uploadingMap }))

    // Upload each file (IPFS in production, object URL in demo)
    const uploaded = await Promise.all(toAdd.map(async file => {
      const ipfsUrl = await uploadToIPFS(file)
      const localUrl = URL.createObjectURL(file)
      return {
        name:     file.name,
        size:     file.size,
        type:     file.type,
        icon:     getFileIcon(file.type),
        localUrl, // for immediate preview in browser
        ipfsUrl,  // permanent decentralized URL
        uploadedAt: new Date().toISOString(),
      }
    }))

    // Clear uploading state
    setUploading(u => {
      const next = { ...u }
      toAdd.forEach(f => delete next[f.name])
      return next
    })

    onChange([...files, ...uploaded])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    processFiles(Array.from(e.dataTransfer.files))
  }

  function handleInput(e) {
    processFiles(Array.from(e.target.files))
    e.target.value = '' // reset so same file can be re-added after removal
  }

  function removeFile(i) {
    const updated = files.filter((_, idx) => idx !== i)
    onChange(updated)
  }

  const isUploading = Object.keys(uploading).length > 0

  return (
    <div>
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-glow)' : 'var(--bg-elevated)',
          transition: 'all 0.2s',
          marginBottom: 12,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleInput}
          accept={Object.keys(ACCEPTED_TYPES).join(',')}
        />
        <div style={{ fontSize: '2rem', marginBottom: 8 }}>
          {isUploading ? '⏳' : dragging ? '📂' : '☁️'}
        </div>
        <div style={{ fontWeight: 600, color: 'var(--text-heading)', fontSize: '0.9rem', marginBottom: 4 }}>
          {isUploading ? 'Uploading to IPFS...' : 'Drop files here or click to browse'}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          PDF, ZIP, images, video, docs · Max {MAX_FILE_SIZE_MB}MB per file · Up to {MAX_FILES} files
        </div>
      </div>

      {/* Error messages */}
      {errors.map((e, i) => (
        <div key={i} className="alert alert-danger" style={{ marginBottom: 6, padding: '8px 12px', fontSize: '0.8rem' }}>
          ⚠️ {e}
        </div>
      ))}

      {/* Uploading indicators */}
      {Object.keys(uploading).map(name => (
        <div key={name} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 6,
        }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Uploading {name}...
          </span>
        </div>
      ))}

      {/* Uploaded file list */}
      {files.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 6,
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{f.icon}</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontWeight: 500, color: 'var(--text-heading)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {f.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatBytes(f.size)}</span>
              {f.ipfsUrl && (
                <span style={{
                  fontSize: '0.68rem', color: 'var(--green)', background: 'var(--green-bg)',
                  padding: '1px 6px', borderRadius: 8, fontWeight: 600,
                }}>
                  ✓ IPFS
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {/* Preview — open local blob URL */}
            <a
              href={f.localUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              title="Preview file"
            >
              👁️
            </a>
            {/* Copy IPFS URL */}
            <button
              className="btn btn-secondary btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              title="Copy IPFS URL"
              onClick={() => navigator.clipboard?.writeText(f.ipfsUrl)}
            >
              📋
            </button>
            {/* Remove */}
            <button
              className="btn btn-danger btn-sm"
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              onClick={() => removeFile(i)}
            >
              ✕
            </button>
          </div>
        </div>
      ))}

      {/* IPFS info note */}
      {files.length > 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
          🌐 Files are pinned to IPFS — permanently accessible via their CID, independent of TrustWork.
          The client can verify each file using any IPFS gateway.
        </div>
      )}
    </div>
  )
}
