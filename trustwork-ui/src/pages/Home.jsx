import { motion } from 'framer-motion'
import ParticleField from '../components/ParticleField'

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0.8, 0.2, 1] } },
}
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}

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
    <div className="home-dark">
      <ParticleField />

      {/* ===== HERO — split layout with isometric illustration ===== */}
      <motion.div
        className="hero-split"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <div className="hero-split-text">
          <motion.div className="hero-badge" variants={fadeUp}>
            Built on Stellar · Powered by Soroban
          </motion.div>
          <motion.h1 className="hero-title-split" variants={fadeUp}>
            Freelance contracts,<br /><span>sealed before work starts.</span>
          </motion.h1>
          <motion.p className="hero-desc-split" variants={fadeUp}>
            TrustWork locks project funds in a smart contract before work begins.
            Clients and freelancers collaborate with confidence — no middlemen,
            no disputes left unresolved.
          </motion.p>
          <motion.div className="hero-actions-split" variants={fadeUp}>
            {wallet ? (
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={() => setPage('create')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Create a Contract
              </motion.button>
            ) : (
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={onConnect}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Connect Wallet to Start
              </motion.button>
            )}
            <motion.button
              className="btn btn-secondary btn-lg"
              onClick={() => setPage('dashboard')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              View Dashboard
            </motion.button>
          </motion.div>
        </div>

        <motion.div
          className="hero-split-visual"
          aria-hidden="true"
          initial={{ opacity: 0, y: 24, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.15 }}
        >
          <IsoIllustration />
        </motion.div>
      </motion.div>

      {/* ===== Trust badge row ===== */}
      <motion.div
        className="trust-row"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.5 }}
      >
        <span className="trust-chip">Stellar Network</span>
        <span className="trust-chip">Soroban Contracts</span>
        <span className="trust-chip audited">✓ Open Source</span>
      </motion.div>

      {/* ===== Features ===== */}
      <div className="section-wrap">
        <motion.div
          className="features-grid"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map(f => (
            <motion.div
              className="feature-card"
              key={f.title}
              variants={fadeUp}
              whileHover={{ y: -4 }}
            >
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ===== How it works ===== */}
      <div className="how-it-works">
        <motion.h2
          style={{ textAlign: 'center', marginBottom: 8 }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5 }}
        >
          How it works
        </motion.h2>
        <motion.p
          style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32 }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          Four steps to secure, trustless freelance collaboration.
        </motion.p>
        <motion.div
          className="how-steps"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {steps.map(s => (
            <motion.div className="how-step" key={s.num} variants={fadeUp}>
              <div className="how-step-num">{s.num}</div>
              <div className="how-step-title">{s.title}</div>
              <div className="how-step-desc">{s.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

/* ── Signature element: an isometric stack of contract panels with a
   lock at the core — built with simple isometric parallelograms in SVG.
   Uses the same CSS custom properties as the rest of the page, so it
   automatically re-themes to the dark palette via `.home-dark`. ── */
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
