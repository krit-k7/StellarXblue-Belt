export default function Home({ onConnect, wallet, setPage }) {
  const features = [
    { icon: '🔒', title: 'Escrow Protection', desc: 'Funds are locked in a Soroban smart contract before work begins. No trust required.' },
    { icon: '⚡', title: 'Stellar Speed', desc: 'Payments settle in seconds on the Stellar network with near-zero fees.' },
    { icon: '⚖️', title: 'Dispute Resolution', desc: 'Human arbitrators resolve disagreements fairly when parties can\'t agree.' },
    { icon: '🤖', title: 'Auto-Release', desc: 'If the client is inactive past the review period, the freelancer can claim automatically.' },
  ]
  const steps = [
    { num: '1', title: 'Connect Wallet', desc: 'Link your Stellar wallet to identify yourself on the platform.' },
    { num: '2', title: 'Create Contract', desc: 'Set terms, deadline, and deposit funds into the escrow smart contract.' },
    { num: '3', title: 'Work & Submit', desc: 'Freelancer completes the project and submits deliverables.' },
    { num: '4', title: 'Approve & Pay', desc: 'Client approves the work and funds are instantly released.' },
  ]

  return (
    <div>
      {/* ===== HERO — split layout with isometric illustration ===== */}
      <div className="hero-split">
        <div className="hero-split-text">
          <div className="hero-badge">Built on Stellar · Powered by Soroban</div>
          <h1 className="hero-title-split">
            Freelance contracts,<br /><span>sealed before work starts.</span>
          </h1>
          <p className="hero-desc-split">
            TrustWork locks project funds in a smart contract before work begins.
            Clients and freelancers collaborate with confidence — no middlemen,
            no disputes left unresolved.
          </p>
          <div className="hero-actions-split">
            {wallet ? (
              <button className="btn btn-primary btn-lg" onClick={() => setPage('create')}>
                Create a Contract
              </button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={onConnect}>
                Connect Wallet to Start
              </button>
            )}
            <button className="btn btn-secondary btn-lg" onClick={() => setPage('dashboard')}>
              View Dashboard
            </button>
          </div>
        </div>

        <div className="hero-split-visual iso-rise" aria-hidden="true">
          <IsoIllustration />
        </div>
      </div>

      {/* ===== Trust badge row ===== */}
      <div className="trust-row">
        <span className="trust-chip">Stellar Network</span>
        <span className="trust-chip">Soroban Contracts</span>
        <span className="trust-chip audited">✓ Open Source</span>
      </div>

      {/* ===== Features ===== */}
      <div className="section-wrap">
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== How it works ===== */}
      <div className="how-it-works">
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>How it works</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32 }}>
          Four steps to secure, trustless freelance collaboration.
        </p>
        <div className="how-steps">
          {steps.map(s => (
            <div className="how-step" key={s.num}>
              <div className="how-step-num">{s.num}</div>
              <div className="how-step-title">{s.title}</div>
              <div className="how-step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Signature element: an isometric stack of contract panels with a
   lock at the core — built with simple isometric parallelograms in SVG,
   themed to the light palette. Floats gently, no external image assets. ── */
function IsoIllustration() {
  return (
    <svg
      className="iso-illustration iso-float"
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of layered contract documents secured by a lock"
    >
      <defs>
        <linearGradient id="isoTop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="isoLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.14" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="isoRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="lockBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-hover)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {/* base shadow */}
      <ellipse cx="200" cy="330" rx="120" ry="14" fill="var(--text-heading)" opacity="0.06" />

      {/* three stacked isometric contract panels, offset diagonally */}
      <g opacity="0.95">
        {/* panel 3 (back, smallest offset) */}
        <g transform="translate(0,40)">
          <polygon points="200,150 290,196 200,242 110,196" fill="url(#isoTop)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <polygon points="110,196 200,242 200,256 110,210" fill="url(#isoLeft)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <polygon points="290,196 200,242 200,256 290,210" fill="url(#isoRight)" stroke="var(--border-strong)" strokeWidth="1.5" />
        </g>
        {/* panel 2 */}
        <g transform="translate(0,8)">
          <polygon points="200,118 296,166 200,214 104,166" fill="url(#isoTop)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <polygon points="104,166 200,214 200,230 104,182" fill="url(#isoLeft)" stroke="var(--border-strong)" strokeWidth="1.5" />
          <polygon points="296,166 200,214 200,230 296,182" fill="url(#isoRight)" stroke="var(--border-strong)" strokeWidth="1.5" />
          {/* faint document lines on top face */}
          <g stroke="var(--border-strong)" strokeWidth="2" strokeLinecap="round" opacity="0.6">
            <line x1="165" y1="148" x2="200" y2="166" />
            <line x1="155" y1="158" x2="190" y2="176" />
          </g>
        </g>
        {/* panel 1 (front, top of stack) */}
        <g>
          <polygon points="200,90 302,140 200,190 98,140" fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="2" />
          <polygon points="98,140 200,190 200,208 98,158" fill="url(#isoLeft)" stroke="var(--border-strong)" strokeWidth="2" />
          <polygon points="302,140 200,190 200,208 302,158" fill="url(#isoRight)" stroke="var(--border-strong)" strokeWidth="2" />
          {/* document lines on the front-top face */}
          <g stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5">
            <line x1="160" y1="122" x2="198" y2="142" />
            <line x1="150" y1="132" x2="186" y2="152" />
            <line x1="140" y1="142" x2="172" y2="160" />
          </g>
        </g>
      </g>

      {/* lock badge floating above the stack */}
      <g transform="translate(200,108)">
        <circle r="34" fill="url(#lockBody)" stroke="var(--accent-hover)" strokeWidth="2" />
        <rect x="-12" y="-3" width="24" height="20" rx="3" fill="#fff" />
        <path d="M-7 -3 v-7 a7 7 0 0 1 14 0 v7" fill="none" stroke="#fff" strokeWidth="4" />
      </g>
    </svg>
  )
}
