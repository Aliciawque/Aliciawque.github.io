import { useEffect } from 'react'

const SPARK_CHARS = '@#$%&*!~^()+={}[]|<>?/'
const MAX_PARTICLES = 30

export default function ScrollSpark() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let particleCount = 0

    const spawnParticle = (direction: 'up' | 'down') => {
      if (particleCount >= MAX_PARTICLES) return
      particleCount++

      const el = document.createElement('span')
      const char = SPARK_CHARS[Math.floor(Math.random() * SPARK_CHARS.length)]
      el.textContent = char
      el.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        font-family: var(--font-en, monospace);
        font-size: ${10 + Math.random() * 8}px;
        color: var(--accent, #00ff88);
        opacity: 0.8;
        left: ${Math.random() * window.innerWidth}px;
        top: ${direction === 'up' ? window.innerHeight + 10 : -10}px;
        transition: all ${1 + Math.random()}s ease-out;
      `
      document.body.appendChild(el)

      requestAnimationFrame(() => {
        el.style.opacity = '0'
        el.style.transform = `
          translateY(${direction === 'up' ? '-' : ''}${100 + Math.random() * 200}px)
          rotate(${(Math.random() - 0.5) * 360}deg)
        `
      })

      setTimeout(() => {
        el.remove()
        particleCount--
      }, 2000)
    }

    let lastScroll = window.scrollY
    let ticking = false

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const currentScroll = window.scrollY
        const delta = currentScroll - lastScroll
        if (Math.abs(delta) > 10) {
          const count = Math.min(3, Math.floor(Math.abs(delta) / 20))
          for (let i = 0; i < count; i++) {
            spawnParticle(delta > 0 ? 'up' : 'down')
          }
        }
        lastScroll = currentScroll
        ticking = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
