import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'
import { LockIcon, BoltIcon, ScaleIcon, AutoReleaseIcon } from '../components/icons'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const stagger = {
  show: { transition: { staggerChildren: 0.12 } }
}

export default function Home({ wallet, onOpenWallet, setPage, theme }) {
  const features = [
    { 
      icon: LockIcon, 
      title: 'Escrow Protection', 
      desc: 'Funds are locked in a Soroban smart contract before work begins. No trust required.' 
    },
    { 
      icon: BoltIcon, 
      title: 'Stellar Speed', 
      desc: 'Payments settle in seconds on the Stellar network with near-zero fees.' 
    },
    { 
      icon: ScaleIcon, 
      title: 'Dispute Resolution', 
      desc: 'Human arbitrators resolve disagreements fairly when parties can\'t agree.' 
    },
    { 
      icon: AutoReleaseIcon, 
      title: 'Auto-Release', 
      desc: 'If the client is inactive past the review period, the freelancer can claim automatically.' 
    }
  ]

  const steps = [
    { num: '1', title: 'Connect Wallet', desc: 'Link your Stellar wallet to identify yourself on the platform.' },
    { num: '2', title: 'Create Contract', desc: 'Set terms, deadline, and deposit funds into the escrow smart contract.' },
    { num: '3', title: 'Work & Submit', desc: 'Freelancer completes the project and submits deliverables.' },
    { num: '4', title: 'Approve & Pay', desc: 'Client approves the work and funds are instantly released.' },
  ]

  return (
    <div className="home-root">
      {/* Hero Section */}
      <section className="hero-container">
        <div className="hero-glow" />
        <ParticleField density={80} color={theme === 'light' ? '13, 148, 136' : '79, 216, 206'} />
        
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div variants={fadeUp} style={{ marginBottom: '24px' }}>
            <span style={{ 
              background: 'var(--accent-glow)', 
              color: 'var(--accent)', 
              padding: '8px 20px', 
              borderRadius: 'var(--radius-pill)',
              fontSize: '0.8rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              border: '1px solid var(--border-glow)'
            }}>
              The Future of Freelance Escrow
            </span>
          </motion.div>
          
          <motion.h1 className="hero-title" variants={fadeUp}>
            Secure your work,<br />
            <span className="italic-serif">guarantee</span> your pay.
          </motion.h1>
          
          <motion.p className="hero-description" variants={fadeUp}>
            TrustWork uses Soroban smart contracts to lock project funds on-chain. 
            Clients and freelancers collaborate with absolute confidence — no middlemen, no surprises.
          </motion.p>
          
          <motion.div className="hero-actions" variants={fadeUp}>
            <button className="btn btn-primary btn-lg" onClick={() => wallet ? setPage('create') : onOpenWallet()}>
              {wallet ? 'Create a Contract' : 'Connect Wallet to Start'}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 10 }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => setPage('dashboard')}>
              View Dashboard
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Trusted By Row */}
      <section style={{ padding: '0 24px' }}>
        <motion.div 
          className="trust-row"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <div className="trust-badge">
            <div className="trust-icon">🚀</div>
            Stellar Network
          </div>
          <div className="trust-badge">
            <div className="trust-icon">💎</div>
            Soroban Smart Contracts
          </div>
          <div className="trust-badge">
            <div className="trust-icon">🛡️</div>
            Trustless Escrow
          </div>
          <div className="trust-badge">
            <div className="trust-icon">✓</div>
            Open Source
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="page" style={{ padding: '100px 24px' }}>
        <div className="section-title">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true }}
          >
            Built for <span className="italic-serif">Professional</span> Trust
          </motion.h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Secure your freelance workflow with blockchain-grade protection.</p>
        </div>

        <motion.div 
          className="features-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((f, i) => (
            <motion.div className="feature-card" key={i} variants={fadeUp}>
              <div className="feature-icon-wrap">
                <f.icon width={24} height={24} />
              </div>
              <h3 style={{ marginBottom: 16 }}>{f.title}</h3>
              <p style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '120px 24px', background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)' }}>
        <div className="section-title">
          <h2 className="italic-serif">The Workflow</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 16 }}>Four simple steps to a secure collaboration.</p>
        </div>

        <div className="page" style={{ padding: 0, marginTop: 60 }}>
          <motion.div
            className="steps-grid"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}
          >
            {steps.map(s => (
              <motion.div className="step-card" key={s.num} variants={fadeUp}>
                <div className="step-number">{s.num}</div>
                <h3 style={{ marginBottom: 12 }}>{s.title}</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '140px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '600px', height: '600px', background: 'var(--grad-glow)', opacity: 0.4, z-index: 0 
        }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h2 style={{ marginBottom: 32 }}>Ready to start working <br/><span className="italic-serif">without</span> the risk?</h2>
          <button className="btn btn-primary btn-lg" onClick={() => wallet ? setPage('create') : onOpenWallet()}>
            Create Your First Contract
          </button>
        </motion.div>
      </section>

      {/* Footer-ish */}
      <footer style={{ padding: '60px 24px', textAlign: 'center', borderTop: '1px solid var(--border)', opacity: 0.5, fontSize: '0.85rem' }}>
        &copy; 2026 TrustWork — The Trustless Freelance Standard
      </footer>
    </div>
  )
}
