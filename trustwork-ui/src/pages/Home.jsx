import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'
import { LockIcon, BoltIcon, ScaleIcon, AutoReleaseIcon } from '../components/icons'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const stagger = {
  show: { transition: { staggerChildren: 0.1 } }
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
        <ParticleField density={130} color={theme === 'light' ? '13, 148, 136' : '79, 216, 206'} />
        
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.div className="hero-badge" variants={fadeUp} style={{ 
            background: 'var(--accent-glow)', 
            color: 'var(--accent)', 
            padding: '6px 16px', 
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '24px',
            display: 'inline-block',
            border: '1px solid var(--border-glow)'
          }}>
            Built on Stellar · Powered by Soroban
          </motion.div>
          
          <motion.h1 className="hero-title" variants={fadeUp}>
            Freelance contracts,<br /><span>sealed before work starts.</span>
          </motion.h1>
          
          <motion.p className="hero-description" variants={fadeUp}>
            TrustWork locks project funds in a smart contract before work begins.
            Clients and freelancers collaborate with confidence — no middlemen,
            no disputes left unresolved.
          </motion.p>
          
          <motion.div className="hero-actions" variants={fadeUp}>
            <button className="btn btn-primary" onClick={() => wallet ? setPage('create') : onOpenWallet()}>
              {wallet ? 'Create a Contract' : 'Connect Wallet to Start'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 8 }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-outline" onClick={() => setPage('dashboard')}>
              View Dashboard
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Trust Row */}
      <motion.div 
        className="trust-row"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px', 
          padding: '20px 0 60px',
          flexWrap: 'wrap'
        }}
      >
        {['Stellar Network', 'Soroban Contracts', '✓ Open Source'].map((text, i) => (
          <span key={i} style={{
            background: 'var(--overlay-1)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '0.8rem',
            color: text.includes('✓') ? 'var(--green)' : 'var(--text-muted)',
            fontWeight: '600'
          }}>{text}</span>
        ))}
      </motion.div>

      {/* Features Section */}
      <section style={{ padding: '80px 0', background: 'var(--bg)' }}>
        <div className="section-title">
          <motion.h2 
            initial={{ opacity: 0 }} 
            whileInView={{ opacity: 1 }} 
            viewport={{ once: true }}
            style={{ marginBottom: 16 }}
          >
            Trustless Collaboration
          </motion.h2>
          <p style={{ color: 'var(--text-muted)' }}>Secure your freelance workflow with blockchain escrow</p>
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
              <h3 style={{ marginBottom: 12 }}>{f.title}</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works Section */}
<section style={{ padding: '100px 24px', borderTop: '1px solid var(--border)' }}>
  <div className="section-title">
    <h2>How it works</h2>
    <p style={{ color: 'var(--text-muted)' }}>Four steps to secure, trustless freelance collaboration.</p>
  </div>

  <div className="steps-track">
    <div className="steps-line" />
    <motion.div
      className="steps-grid"
      variants={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {steps.map(s => (
        <motion.div className="step-card" key={s.num} variants={fadeUp}>
          <div className="step-number">{s.num}</div>
          <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{s.desc}</p>
        </motion.div>
      ))}
    </motion.div>
  </div>
</section>

      {/* Bottom CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center', borderTop: '1px solid var(--border)', background: 'radial-gradient(circle at center, rgba(79,216,206,0.05) 0%, transparent 70%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 style={{ marginBottom: 24 }}>Ready to secure your work?</h2>
          <button className="btn btn-primary" onClick={() => wallet ? setPage('create') : onOpenWallet()}>
            Create Your First Contract
          </button>
        </motion.div>
      </section>
    </div>
  )
}
