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
      {/* ===== HERO — split layout with signature seal illustration ===== */}
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

        <div className="hero-split-visual" aria-hidden="true">
          <SealIllustration />
        </div>
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

/* ── Signature element: an escrow seal — a locked ledger page with a
   wax-stamp clasp. Built as SVG so it's crisp at any size and themeable
   with the existing CSS variables. ── */
function SealIllustration() {
  return (
    <svg
      className="seal-illustration"
      viewBox="0 0 480 480"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a sealed escrow contract"
    >
      <defs>
        <radialGradient id="sealGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sealMetal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-hover)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>

      {/* ambient glow */}
      <circle cx="240" cy="240" r="220" fill="url(#sealGlow)" className="seal-pulse" />

      {/* document body */}
      <g>
        <rect x="120" y="86" width="240" height="320" rx="6"
              fill="var(--bg-card)" stroke="var(--border-strong)" strokeWidth="1.5" />
        {/* inner rule, like a certificate border */}
        <rect x="134" y="100" width="212" height="292" rx="3"
              fill="none" stroke="var(--border)" strokeWidth="1" />

        {/* text lines */}
        <g stroke="var(--border-strong)" strokeWidth="3" strokeLinecap="round">
          <line x1="156" y1="138" x2="324" y2="138" />
          <line x1="156" y1="158" x2="300" y2="158" />
          <line x1="156" y1="178" x2="312" y2="178" />
        </g>

        {/* signature row */}
        <g stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
          <path d="M156 330 q10 -16 20 0 t20 0 t20 0 t20 0" fill="none" />
          <line x1="156" y1="350" x2="230" y2="350" />
        </g>

        <g stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55">
          <path d="M260 330 q8 -14 16 0 t16 0 t16 0" fill="none" />
          <line x1="260" y1="350" x2="320" y2="350" />
        </g>
      </g>

      {/* wax seal / clasp, centered over the fold */}
      <g className="seal-stamp">
        <circle cx="240" cy="240" r="54" fill="url(#sealMetal)" stroke="var(--accent-hover)" strokeWidth="2" />
        <circle cx="240" cy="240" r="54" fill="none" stroke="var(--accent-ink)" strokeWidth="1" opacity="0.25" />
        {/* lock glyph */}
        <g transform="translate(240,240)">
          <rect x="-16" y="-4" width="32" height="26" rx="4" fill="var(--accent-ink)" />
          <path d="M-10 -4 v-10 a10 10 0 0 1 20 0 v10" fill="none" stroke="var(--accent-ink)" strokeWidth="5" />
        </g>
      </g>
    </svg>
  )
}
