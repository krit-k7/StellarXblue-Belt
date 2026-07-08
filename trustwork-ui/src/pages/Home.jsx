import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const stagger = {
  show: { transition: { staggerChildren: 0.1 } }
}

export default function Home({ wallet, onOpenWallet, setPage }) {
  const features = [
    { 
      icon: '🛡️', 
      title: 'Decentralized Escrow', 
      desc: 'Smart contract based funds protection. Payments are only released when milestones are met.' 
    },
    { 
      icon: '⚖️', 
      title: 'Quadratic Arbitration', 
      desc: 'Fair and transparent dispute resolution powered by community-driven quadratic voting.' 
    },
    { 
      icon: '⚡', 
      title: 'Stellar Speed', 
      desc: 'Near-instant settlement and negligible fees thanks to the Stellar network architecture.' 
    }
  ]

  return (
    <div className="home-root">
      {/* Hero Section */}
      <section className="hero-container">
        <ParticleField density={100} color="255, 255, 255" />
        
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.h1 className="hero-title" variants={fadeUp}>
            Democratic Governance <br />
            powered by <span>Quadratic Voting</span>
          </motion.h1>
          
          <motion.p className="hero-description" variants={fadeUp}>
            Empower DAO members to propose, vote quadratically on funding allocations, 
            and execute decentralized treasury grants trustlessly.
          </motion.p>
          
          <motion.div className="hero-actions" variants={fadeUp}>
            <button className="btn btn-primary" onClick={() => wallet ? setPage('dashboard') : onOpenWallet()}>
              {wallet ? 'Enter Voting Portal' : 'Connect Wallet'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginLeft: 8 }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <button className="btn btn-outline" onClick={() => setPage('transfer')}>
              Direct XLM Transfer
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* Pillars Section */}
      <section className="pillars-section" style={{ padding: '100px 0', background: '#05070a' }}>
        <div className="section-title">
          <motion.h2 
            initial={{ opacity: 0 }} 
            whileInView={{ opacity: 1 }} 
            viewport={{ once: true }}
            style={{ marginBottom: 16 }}
          >
            StellarX Core Protocol Pillars
          </motion.h2>
          <p style={{ color: 'var(--text-muted)' }}>Building the future of decentralized collaboration</p>
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
              <span className="feature-icon">{f.icon}</span>
              <h3 style={{ marginBottom: 12 }}>{f.title}</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '100px 24px', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
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
