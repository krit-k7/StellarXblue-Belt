import { useEffect, useRef } from 'react'

/* ── ParticleField ─────────────────────────────────────────────────────────
   Lightweight canvas network background (nodes + connecting lines that
   drift and link when close) — no external deps. Used behind the Home
   page dark hero, echoing the GovVault look. Respects reduced-motion and
   auto-pauses when the tab isn't visible. ── */
export default function ParticleField({ density = 60, color = '110, 231, 214' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0, height = 0, dpr = Math.min(window.devicePixelRatio || 1, 2)
    let particles = []
    let animId = null
    let visible = true

    function resize() {
      const parent = canvas.parentElement
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = width + 'px'
      canvas.style.height = height + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = Math.min(density, Math.floor((width * height) / 14000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.6 + 0.6,
      }))
    }

    function step() {
      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }

      const linkDist = Math.min(150, width / 5)
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < linkDist) {
            ctx.strokeStyle = `rgba(${color}, ${0.16 * (1 - dist / linkDist)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color}, 0.55)`
        ctx.fill()
      }

      if (visible && !reduceMotion) animId = requestAnimationFrame(step)
    }

    function handleVisibility() {
      visible = document.visibilityState === 'visible'
      if (visible && !reduceMotion && !animId) step()
    }

    resize()
    step()

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (animId) cancelAnimationFrame(animId)
    }
  }, [density, color])

  return <canvas ref={canvasRef} className="particle-field" aria-hidden="true" />
}
