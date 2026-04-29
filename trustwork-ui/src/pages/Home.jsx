export default function Home({ onConnect, wallet, setPage }) {
  const features = [
    { icon: '🔒', bg: 'var(--accent-glow)', title: 'Escrow Protection', desc: 'Funds are locked in a Soroban smart contract before work begins. No trust required.' },
    { icon: '⚡', bg: 'var(--purple-bg)', title: 'Stellar Speed', desc: 'Payments settle in seconds on the Stellar network with near-zero fees.' },
    { icon: '⚖️', bg: 'var(--yellow-bg)', title: 'Dispute Resolution', desc: 'Human arbitrators resolve disagreements fairly when parties can\'t agree.' },
    { icon: '🤖', bg: 'var(--green-bg)', title: 'Auto-Release', desc: 'If the client is inactive past the review period, the freelancer can claim automatically.' },
  ]

  const steps = [
    { num: '1', title: 'Connect Wallet', desc: 'Link your Stellar wallet to identify yourself on the platform.' },
    { num: '2', title: 'Create Contract', desc: 'Set terms, deadline, and deposit funds into the escrow smart contract.' },
    { num: '3', title: 'Work & Submit', desc: 'Freelancer completes the project and submits deliverables.' },
    { num: '4', title: 'Approve & Pay', desc: 'Client approves the work and funds are instantly released.' },
  ]

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        <div className="hero-badge">⚡ Built on Stellar · Powered by Soroban</div>
        <h1 className="hero-title">
          Freelance Contracts,<br /><span>Trustless by Design</span>
        </h1>
        <p className="hero-desc">
          TrustWork locks project funds in a smart contract before work begins.
          Clients and freelancers collaborate with confidence — no middlemen, no disputes left unresolved.
        </p>
        <div className="hero-actions">
          {wallet ? (
            <button className="btn btn-primary btn-lg" onClick={() => setPage('create')}>
              🚀 Create a Contract
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

      {/* Features */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        <div className="features-grid">
          {features.map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon" style={{ background: f.bg }}>{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="how-it-works">
        <h2 style={{ textAlign: 'center', marginBottom: 8 }}>How It Works</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32 }}>
          Four simple steps to secure, trustless freelance collaboration
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
