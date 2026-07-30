import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'
import { LockIcon, BoltIcon, ScaleIcon, AutoReleaseIcon, LogoMark } from '../components/icons'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
}

const stagger = {
  show: { transition: { staggerChildren: 0.15 } }
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
      {/* Hero Section - Inspired by the requested design */}
      <section className="hero-container" style={{ paddingTop: '80px', paddingBottom: '120px' }}>
        <div className="glow-bg" />
        <ParticleField density={100} color={theme === 'light' ? '37, 99, 235' : '59, 130, 246'} />
        
        <motion.div 
          className="hero-content"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.h1 
            className="hero-title" 
            variants={fadeUp}
            style={{ 
              fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              marginBottom: '16px'
            }}
          >
            Trustless Escrow<br />For Everyone.
          </motion.h1>
          
          <motion.h2 
            variants={fadeUp}
            style={{ 
              fontSize: 'clamp(1.8rem, 4vw, 3.2rem)',
              fontWeight: 600,
              fontStyle: 'italic',
              marginBottom: '32px',
              color: 'rgba(255,255,255,0.9)'
            }}
          >
            Seamlessly On Stellar.
          </motion.h2>
          
          <motion.p 
            className="hero-description" 
            variants={fadeUp}
            style={{ 
              fontSize: '1.25rem',
              color: 'var(--text-muted)',
              marginBottom: '48px',
              maxWidth: '600px',
              margin: '0 auto 48px'
            }}
          >
            No Banks. No delays. Just instant,<br />
            on-chain transaction protection.
          </motion.p>
          
          <motion.div className="hero-actions" variants={fadeUp}>
            <motion.button 
              className="btn btn-primary" 
              onClick={() => wallet ? setPage('create') : onOpenWallet()}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)' }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                padding: '16px 40px', 
                fontSize: '1rem', 
                borderRadius: '40px',
                background: '#fff',
                color: '#000',
                fontWeight: 700
              }}
            >
              🚀 Get Started
            </motion.button>
          </motion.div>

          <motion.div 
            variants={fadeUp}
            style={{ marginTop: '80px' }}
          >
            <p style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.2em', 
              color: 'var(--text-muted)',
              marginBottom: '24px'
            }}>
              Trusted by leading communities
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', opacity: 0.7 }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--overlay-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LogoMark size={24} />
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--overlay-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '4px' }} />
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--overlay-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '24px', height: '24px', border: '2px solid #fff', borderRadius: '50%' }} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section style={{ padding: '120px 24px', background: 'var(--bg-sunken)' }}>
        <div className="section-title">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
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
            <motion.div className="feature-card" key={i} variants={fadeUp} whileHover={{ y: -8 }}>
              <div className="feature-icon-wrap" style={{ background: 'var(--grad-primary)', color: '#fff' }}>
                <f.icon width={24} height={24} />
              </div>
              <h3 style={{ marginBottom: 12 }}>{f.title}</h3>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)' }}>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '120px 24px', background: 'var(--bg)' }}>
        <div className="section-title">
          <h2>Professional Workflow</h2>
          <p style={{ color: 'var(--text-muted)' }}>Four steps to secure, trustless freelance collaboration.</p>
        </div>

        <motion.div
          className="steps-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          style={{ maxWidth: '1100px', margin: '0 auto' }}
        >
          {steps.map(s => (
            <motion.div className="step-card" key={s.num} variants={fadeUp} whileHover={{ borderColor: 'var(--accent)' }}>
              <div className="step-number" style={{ background: 'var(--grad-primary)', color: '#fff' }}>{s.num}</div>
              <h3 style={{ marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{s.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Bottom CTA */}
      <section style={{ padding: '140px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          width: '400px', 
          height: '400px', 
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
          zIndex: 0
        }} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 1 }}
        >
          <h2 style={{ marginBottom: 24, fontSize: '3rem' }}>Ready to secure your work?</h2>
          <motion.button 
            className="btn btn-primary" 
            onClick={() => wallet ? setPage('create') : onOpenWallet()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            style={{ padding: '16px 48px', borderRadius: '40px' }}
          >
            Create Your First Contract
          </motion.button>
        </motion.div>
      </section>
    </div>
  )
}
